import { NextRequest, NextResponse } from "next/server";

// Sarah: mature, reassuring, confident. A calm voice for an accessibility tool.
const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

/**
 * ElevenLabs text-to-speech for the fallback voice path. Streams mp3 back;
 * far more natural than the browser's built-in voice.
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = (await request.json()) as { text?: string };
    if (!text || text.length > 2000) {
      return NextResponse.json({ error: "missing or oversized text" }, { status: 400 });
    }
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_flash_v2_5",
          voice_settings: { stability: 0.4, similarity_boost: 0.75 },
        }),
        cache: "no-store",
      },
    );
    if (!res.ok) throw new Error(`ElevenLabs HTTP ${res.status}`);
    return new NextResponse(res.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("speak failed", err);
    return NextResponse.json({ error: "could not synthesize speech" }, { status: 502 });
  }
}
