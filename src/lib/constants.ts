import { SegmentType } from "@/generated/prisma/enums";

// The recurring UI pattern: a pick-list for speed and consistency, plus an
// "other, specify" escape hatch for creativity. Common cases stay countable
// ("how many ladder matches has this wrestler had"); one-offs are still
// recorded faithfully.

export const SEGMENT_TYPE_LABELS: Record<SegmentType, string> = {
  MATCH: "Match",
  PROMO: "Promo",
  BACKSTAGE: "Backstage",
  CONTRACT_SIGNING: "Contract Signing",
  VIDEO_PACKAGE: "Video Package",
  BRAWL: "Brawl",
  INTERVIEW: "Interview",
  ANGLE: "Angle",
  OTHER: "Other, specify…",
};

export const SEGMENT_TYPES = Object.keys(SEGMENT_TYPE_LABELS) as SegmentType[];

export function segmentTypeLabel(type: SegmentType, customType?: string | null): string {
  if (type === SegmentType.OTHER) return customType?.trim() || "Segment";
  return SEGMENT_TYPE_LABELS[type];
}

export const STIPULATIONS = [
  "Steel Cage",
  "Ladder",
  "TLC",
  "Tables",
  "No Disqualification",
  "Hardcore",
  "Last Man Standing",
  "Iron Man",
  "Submission",
  "Hell in a Cell",
  "Royal Rumble",
  "Battle Royal",
  "Falls Count Anywhere",
  "2 out of 3 Falls",
  "Street Fight",
  "Cash-in",
];

export const ALIGNMENT_LABELS = {
  FACE: "Face",
  HEEL: "Heel",
  TWEENER: "Tweener",
} as const;

export const GENDER_LABELS = {
  MALE: "Men",
  FEMALE: "Women",
  OTHER: "Other",
} as const;

export const CADENCE_LABELS = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Every 2 weeks",
  MONTHLY: "Monthly",
} as const;

/**
 * What a unit *is* is never stored: it is the member count, so a faction that
 * loses a member is a trio the moment they leave — no field to forget to
 * update. Lives here rather than in derive.ts only because the create form
 * needs it in the browser.
 */
export function unitKind(size: number): string {
  if (size >= 4) return "Faction";
  if (size === 3) return "Trio";
  if (size === 2) return "Tag team";
  if (size === 1) return "Solo act";
  return "Empty";
}
