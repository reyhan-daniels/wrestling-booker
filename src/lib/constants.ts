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

export const CADENCE_LABELS = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Every 2 weeks",
  MONTHLY: "Monthly",
} as const;
