import { NextRequest, NextResponse } from "next/server";
import { lookupBarcode } from "@/lib/openbeautyfacts";
import { composeProductRead } from "@/lib/spoken-read";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ barcode: string }> },
) {
  const { barcode } = await ctx.params;
  if (!/^\d{6,14}$/.test(barcode)) {
    return NextResponse.json({ error: "invalid barcode" }, { status: 400 });
  }
  try {
    const needs = request.nextUrl.searchParams.get("needs")?.slice(0, 300) ?? undefined;
    const lookup = await lookupBarcode(barcode);
    const read = composeProductRead(lookup, needs);
    return NextResponse.json({ status: lookup.status, read });
  } catch (err) {
    console.error("product lookup failed", err);
    return NextResponse.json(
      { error: "the product database did not respond" },
      { status: 502 },
    );
  }
}
