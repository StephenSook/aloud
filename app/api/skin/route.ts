import { NextRequest, NextResponse } from "next/server";
import { createSkinTask, registerFile, uploadBytes } from "@/lib/youcam";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const image = form.get("image");
    if (!(image instanceof File)) {
      return NextResponse.json({ error: "missing image file" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(image.type)) {
      return NextResponse.json({ error: "image must be jpeg or png" }, { status: 400 });
    }
    if (image.size > MAX_BYTES) {
      return NextResponse.json({ error: "image exceeds 10MB" }, { status: 400 });
    }

    const { fileId, putUrl, putHeaders } = await registerFile(
      image.name || "capture.jpg",
      image.size,
      image.type,
    );
    await uploadBytes(putUrl, putHeaders, await image.arrayBuffer());
    const taskId = await createSkinTask(fileId);
    return NextResponse.json({ taskId });
  } catch (err) {
    console.error("skin task creation failed", err);
    return NextResponse.json(
      { error: "the analysis service could not accept the photo right now" },
      { status: 502 },
    );
  }
}
