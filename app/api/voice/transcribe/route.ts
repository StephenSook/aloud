import { NextRequest, NextResponse } from "next/server";

/**
 * Deepgram speech-to-text for the push-to-talk fallback voice path (works when
 * WebRTC Realtime is blocked). Accepts the recorded audio bytes directly.
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "audio/webm";
    const audio = await request.arrayBuffer();
    if (audio.byteLength === 0) {
      return NextResponse.json({ error: "no audio" }, { status: 400 });
    }
    const res = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": contentType,
        },
        body: audio,
        cache: "no-store",
      },
    );
    if (!res.ok) throw new Error(`Deepgram HTTP ${res.status}`);
    const body = (await res.json()) as {
      results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
    };
    const text = body.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
    return NextResponse.json({ text });
  } catch (err) {
    console.error("transcribe failed", err);
    return NextResponse.json({ error: "could not transcribe" }, { status: 502 });
  }
}
