/**
 * A wrestler's face wherever their name appears. Falls back to initials on the
 * company accent, so a roster with no photos still looks deliberate.
 */
export function Avatar({
  id,
  name,
  hasPhoto,
  size = 40,
  className = "",
}: {
  id: string;
  name: string;
  hasPhoto?: boolean;
  size?: number;
  className?: string;
}) {
  // One-word ring names (Gunther, HENARE, MJF) need two letters of the same
  // word, or the avatar shows a lone character and looks broken.
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = (
    words.length > 1 ? words.slice(0, 2).map((w) => w[0]).join("") : (words[0] ?? "?").slice(0, 2)
  ).toUpperCase();

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-ink-700 bg-ink-800 ${className}`}
      style={{ width: size, height: size }}
    >
      {hasPhoto ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`/api/wrestlers/${id}/photo`}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className="display font-semibold text-ink-400"
          style={{ fontSize: Math.max(10, Math.round(size * 0.34)) }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
