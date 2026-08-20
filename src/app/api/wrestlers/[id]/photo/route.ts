import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

// Portraits live in Postgres so they are covered by the same backups as the
// rest of the world. One image per wrestler, replaced in place.

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function GET(_request: NextRequest, context: RouteContext<"/api/wrestlers/[id]/photo">) {
  const { id } = await context.params;
  const photo = await db.wrestlerPhoto.findUnique({ where: { wrestlerId: id } });
  if (!photo) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "private, max-age=0, must-revalidate",
      ETag: `"${photo.updatedAt.getTime()}"`,
    },
  });
}

export async function POST(request: NextRequest, context: RouteContext<"/api/wrestlers/[id]/photo">) {
  const { id } = await context.params;
  const form = await request.formData();
  const file = form.get("photo");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Use a JPEG, PNG, WebP or GIF." }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 2 MB." }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  await db.wrestlerPhoto.upsert({
    where: { wrestlerId: id },
    create: { wrestlerId: id, mimeType: file.type, bytes },
    update: { mimeType: file.type, bytes },
  });

  revalidatePath(`/roster/${id}`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, context: RouteContext<"/api/wrestlers/[id]/photo">) {
  const { id } = await context.params;
  await db.wrestlerPhoto.deleteMany({ where: { wrestlerId: id } });
  revalidatePath(`/roster/${id}`);
  return NextResponse.json({ ok: true });
}
