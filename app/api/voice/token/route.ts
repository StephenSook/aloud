import { NextResponse } from "next/server";

/**
 * Mints a short-lived Realtime client secret so the browser can open a
 * WebRTC voice session without ever seeing the real OpenAI key.
 */
export async function POST() {
  try {
    const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: { type: "realtime", model: "gpt-realtime-mini" },
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`client_secrets HTTP ${res.status}`);
    const body = (await res.json()) as { value: string; expires_at: number };
    return NextResponse.json({ token: body.value, expiresAt: body.expires_at });
  } catch (err) {
    console.error("voice token mint failed", err);
    return NextResponse.json(
      { error: "voice is unavailable right now" },
      { status: 502 },
    );
  }
}
