import { NextRequest, NextResponse } from "next/server";
import { describeIngredient, lookupIngredient } from "@/lib/cosing";

/** Voice-tool endpoint: EU CosIng lookup for one ingredient name. */
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.slice(0, 120);
  if (!name) return NextResponse.json({ error: "missing name" }, { status: 400 });
  const hit = lookupIngredient(name);
  if (!hit) return NextResponse.json({ found: false });
  return NextResponse.json({
    found: true,
    functions: hit.functions,
    spoken: describeIngredient(name),
  });
}
