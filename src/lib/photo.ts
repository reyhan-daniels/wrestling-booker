// Shared by the creation form, the edit form and the upload route, so the
// rules a wrestler's portrait has to satisfy are stated exactly once.
//
// Portraits live in Postgres rather than object storage, so they are covered
// by the same backups as the rest of the world — which is also why the cap is
// deliberately small.

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** For the file input's accept attribute. */
export const PHOTO_ACCEPT = ALLOWED_PHOTO_TYPES.join(",");

export function describePhotoLimit(): string {
  return `JPEG, PNG, WebP or GIF, up to ${Math.round(MAX_PHOTO_BYTES / 1024 / 1024)} MB.`;
}

/** Returns an error message, or null when the file is acceptable. */
export function validatePhoto(file: File): string | null {
  if (file.size === 0) return "That file is empty.";
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) return "Use a JPEG, PNG, WebP or GIF.";
  if (file.size > MAX_PHOTO_BYTES) {
    return `Image must be under ${Math.round(MAX_PHOTO_BYTES / 1024 / 1024)} MB.`;
  }
  return null;
}

/**
 * Pulls a validated portrait out of submitted form data. Returns null when no
 * file was chosen, which is the normal case.
 */
export async function readPhoto(
  data: FormData,
  field = "photo",
): Promise<{ mimeType: string; bytes: Uint8Array<ArrayBuffer> } | null> {
  const file = data.get(field);
  if (!(file instanceof File) || file.size === 0) return null;

  const problem = validatePhoto(file);
  if (problem) throw new Error(problem);

  // Prisma maps Bytes to Uint8Array; Buffer's generic type does not fit.
  return { mimeType: file.type, bytes: new Uint8Array(await file.arrayBuffer()) };
}
