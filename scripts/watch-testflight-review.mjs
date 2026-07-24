#!/usr/bin/env node
// Poll App Store Connect for the Beta App Review state of the Aloud Beauty
// external TestFlight build and post a macOS notification when it flips out of
// "Waiting for Review" (approved or rejected). No npm dependencies: the ES256
// JWT is signed with Node's built-in crypto, and the .p8 stays on disk.
//
// Config comes from the environment (the launchd plist supplies it):
//   ASC_KEY_ID     App Store Connect API key id (e.g. 2V6JG85N6W)
//   ASC_ISSUER_ID  Issuer id (uuid)
//   ASC_KEY_PATH   Absolute path to AuthKey_*.p8
//   ASC_APP_ID     App Apple id / adamId (e.g. 6793837284)
//   ASC_BUILD_VERSION  CFBundleVersion of the build to watch (e.g. 202607231825)
//   ASC_WATCH_STATE_DIR  Where to keep the last-seen state + logs
//
// Exit codes: 0 pending or terminal handled, 2 config/auth/API error.

import { createSign } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const cfg = {
  keyId: process.env.ASC_KEY_ID,
  issuerId: process.env.ASC_ISSUER_ID,
  keyPath: process.env.ASC_KEY_PATH,
  appId: process.env.ASC_APP_ID,
  buildVersion: process.env.ASC_BUILD_VERSION,
  stateDir: process.env.ASC_WATCH_STATE_DIR || join(process.env.HOME, ".aloud-testflight-watch"),
  label: process.env.ASC_WATCH_LABEL || "com.aloudbeauty.testflight-watch",
};

function fail(msg) {
  console.error(`[${new Date().toISOString()}] ERROR ${msg}`);
  process.exit(2);
}

for (const k of ["keyId", "issuerId", "keyPath", "appId", "buildVersion"]) {
  if (!cfg[k]) fail(`missing config: ${k}`);
}
if (!existsSync(cfg.keyPath)) fail(`key file not found: ${cfg.keyPath}`);
mkdirSync(cfg.stateDir, { recursive: true });

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

function makeJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: cfg.keyId, typ: "JWT" };
  const payload = {
    iss: cfg.issuerId,
    iat: now,
    exp: now + 15 * 60,
    aud: "appstoreconnect-v1",
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const privateKey = readFileSync(cfg.keyPath, "utf8");
  const signer = createSign("SHA256");
  signer.update(signingInput);
  // ASC requires the raw r||s signature (IEEE P1363), not DER.
  const sig = signer.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${b64url(sig)}`;
}

async function ascGet(path) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    headers: { Authorization: `Bearer ${makeJwt()}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    fail(`API ${res.status} for ${path}: ${body.slice(0, 400)}`);
  }
  return res.json();
}

function notify(title, message) {
  // Prefer terminal-notifier if installed; fall back to osascript.
  try {
    execFileSync("terminal-notifier", ["-title", title, "-message", message, "-sound", "default"], {
      stdio: "ignore",
    });
    return;
  } catch {}
  try {
    const esc = (s) => s.replace(/["\\]/g, "\\$&");
    execFileSync("osascript", [
      "-e",
      `display notification "${esc(message)}" with title "${esc(title)}" sound name "Glass"`,
    ]);
  } catch (e) {
    console.error(`notify failed: ${e.message}`);
  }
}

function selfUnload() {
  // Stop the launchd job once a terminal state is reached; best-effort.
  try {
    const uid = process.getuid();
    execFileSync("launchctl", ["bootout", `gui/${uid}/${cfg.label}`], { stdio: "ignore" });
  } catch {}
}

const stamp = () => new Date().toISOString();
const statePath = join(cfg.stateDir, "last-state.txt");
const logPath = join(cfg.stateDir, "watch.log");
const log = (line) => {
  const l = `[${stamp()}] ${line}\n`;
  process.stdout.write(l);
  try { writeFileSync(logPath, l, { flag: "a" }); } catch {}
};

// externalBuildState is the build-level truth for the EXTERNAL testing track.
const APPROVED = new Set(["BETA_APPROVED", "READY_FOR_BETA_TESTING", "IN_BETA_TESTING"]);
const REJECTED = new Set(["BETA_REJECTED"]);
const TERMINAL = new Set([...APPROVED, ...REJECTED, "EXPIRED"]);

async function main() {
  // Pull recent builds for the app with their buildBetaDetail. buildBetaDetail
  // is 1:1 with a build and shares the build's resource id, so we match on that.
  const q =
    `/v1/builds?filter[app]=${cfg.appId}` +
    `&sort=-uploadedDate&limit=20` +
    `&include=buildBetaDetail` +
    `&fields[builds]=version,uploadedDate,buildBetaDetail` +
    `&fields[buildBetaDetails]=externalBuildState,internalBuildState`;
  const data = await ascGet(q);

  const detailByBuildId = new Map(
    (data.included || [])
      .filter((i) => i.type === "buildBetaDetails")
      .map((i) => [i.id, i.attributes?.externalBuildState])
  );

  const build = (data.data || []).find((b) => b.attributes?.version === cfg.buildVersion);
  if (!build) {
    log(`build ${cfg.buildVersion} not found in latest 20 builds; will retry next run`);
    return;
  }
  // Prefer the explicit relationship link; fall back to the shared-id contract.
  const detailId = build.relationships?.buildBetaDetail?.data?.id || build.id;
  const state = detailByBuildId.get(detailId) || "UNKNOWN";

  const prev = existsSync(statePath) ? readFileSync(statePath, "utf8").trim() : "";
  log(`build ${cfg.buildVersion} externalBuildState=${state} (prev=${prev || "none"})`);

  if (state !== prev) {
    writeFileSync(statePath, state);
    if (APPROVED.has(state)) {
      notify("TestFlight: Aloud Beauty APPROVED", "External beta approved. Public link is live.");
      log("NOTIFIED approved; unloading watcher");
      selfUnload();
    } else if (REJECTED.has(state)) {
      notify("TestFlight: Aloud Beauty REJECTED", "Beta App Review rejected the build. Check App Store Connect.");
      log("NOTIFIED rejected; unloading watcher");
      selfUnload();
    } else if (prev && !TERMINAL.has(prev)) {
      // e.g. WAITING_FOR_BETA_REVIEW -> IN_BETA_REVIEW: informational only.
      notify("TestFlight: Aloud Beauty", `Review state: ${state}`);
    }
  }
}

main().catch((e) => fail(e.stack || String(e)));
