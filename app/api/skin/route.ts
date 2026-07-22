import { NextRequest, NextResponse } from "next/server";
import { createSkinTask, registerFile, runSkinTone, uploadBytes } from "@/lib/youcam";
import { analyzeSkinViaMcp } from "@/lib/youcam-mcp";
import { parseToneContext } from "@/lib/skin-tone";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const image = form.get("image");
    // Optional flex: route the analysis through Perfect Corp's native YouCam
    // MCP server instead of the REST endpoints. Same account, same result;
    // proves agentic MCP consumption, the sponsor's 2026 direction.
    const engine = form.get("engine") === "mcp" ? "mcp" : "rest";
    if (!(image instanceof File)) {
      return NextResponse.json({ error: "missing image file" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(image.type)) {
      return NextResponse.json({ error: "image must be jpeg or png" }, { status: 400 });
    }
    if (image.size > MAX_BYTES) {
      return NextResponse.json({ error: "image exceeds 10MB" }, { status: 400 });
    }

    const bytes = await image.arrayBuffer();
    const { fileId, putUrl, putHeaders } = await registerFile(
      image.name || "capture.jpg",
      image.size,
      image.type,
    );
    await uploadBytes(putUrl, putHeaders, bytes);

    // Skin Tone Analysis runs in parallel, used only to calibrate the honesty
    // of the read (bias-aware confidence). Best-effort: never blocks the read.
    const tonePromise = runSkinTone(bytes, image.type);

    if (engine === "mcp") {
      // The MCP tool returns the full result synchronously.
      const [result, toneResults] = await Promise.all([
        analyzeSkinViaMcp(fileId, ["redness", "oiliness", "moisture", "texture"]),
        tonePromise,
      ]);
      return NextResponse.json({ engine: "mcp", result, tone: parseToneContext(toneResults) });
    }

    const [taskId, toneResults] = await Promise.all([createSkinTask(fileId), tonePromise]);
    return NextResponse.json({ engine: "rest", taskId, tone: parseToneContext(toneResults) });
  } catch (err) {
    console.error("skin task creation failed", err);
    return NextResponse.json(
      { error: "the analysis service could not accept the photo right now" },
      { status: 502 },
    );
  }
}
