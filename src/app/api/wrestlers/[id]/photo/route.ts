import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

// Portraits live in Postgres so they are covered by the same backups as the
// rest of the world. One image per wrestler, replaced in place.

import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES } from "@/lib/photo";

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

  // The toggle is presentational for reads — stored photos keep serving — but
  // it should not quietly accept new ones while the feature is switched off.
  const wrestler = await db.wrestler.findUnique({
    where: { id },
    select: { world: { select: { photosEnabled: true } } },
  });
  if (!wrestler) return NextResponse.json({ error: "No such wrestler." }, { status: 404 });
  if (!wrestler.world.photosEnabled) {
    return NextResponse.json({ error: "Photos are turned off for this world." }, { status: 409 });
  }

  const form = await request.formData();
  const file = form.get("photo");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Use a JPEG, PNG, WebP or GIF." }, { status: 415 });
  }
  if (file.size > MAX_PHOTO_BYTES) {
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
