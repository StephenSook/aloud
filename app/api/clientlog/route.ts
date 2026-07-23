import { NextRequest, NextResponse } from "next/server";

/**
 * Sink for client-side errors, so a crash on a real device (which we cannot
 * reproduce on desktop) shows up in the server logs. Temporary diagnostic.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      message?: string;
      stack?: string;
      where?: string;
      ua?: string;
    };
    console.error(
      "CLIENT-ERROR",
      JSON.stringify({
        message: body.message?.slice(0, 500),
        stack: body.stack?.slice(0, 1200),
        where: body.where?.slice(0, 200),
        ua: body.ua?.slice(0, 200),
      }),
    );
  } catch {
    // ignore
  }
  return NextResponse.json({ ok: true });
}
