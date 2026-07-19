import { NextRequest, NextResponse } from "next/server";
import { getSkinTask } from "@/lib/youcam";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await ctx.params;
    const result = await getSkinTask(taskId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("skin task poll failed", err);
    return NextResponse.json(
      { error: "could not reach the analysis service" },
      { status: 502 },
    );
  }
}
