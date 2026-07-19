import { NextRequest, NextResponse } from "next/server";
import { lookupBarcode } from "@/lib/openbeautyfacts";
import { composeComparisonRead } from "@/lib/spoken-read";

export async function GET(request: NextRequest) {
  const a = request.nextUrl.searchParams.get("a") ?? "";
  const b = request.nextUrl.searchParams.get("b") ?? "";
  if (!/^\d{6,14}$/.test(a) || !/^\d{6,14}$/.test(b)) {
    return NextResponse.json({ error: "two valid barcodes required" }, { status: 400 });
  }
  try {
    const [lookupA, lookupB] = await Promise.all([lookupBarcode(a), lookupBarcode(b)]);
    return NextResponse.json({ spoken: composeComparisonRead(lookupA, lookupB) });
  } catch (err) {
    console.error("compare failed", err);
    return NextResponse.json(
      { error: "the product database did not respond" },
      { status: 502 },
    );
  }
}
