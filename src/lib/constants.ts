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

/** A belt held by more than one person. Same shape as `unitKind`. */
export function titleKind(holderCount: number): string {
  if (holderCount >= 4) return "Faction";
  if (holderCount === 3) return "Trios";
  if (holderCount === 2) return "Tag team";
  return "Singles";
}

export const TITLE_HOLDER_OPTIONS = [
  { value: 1, label: "Singles" },
  { value: 2, label: "Tag team" },
  { value: 3, label: "Trios" },
] as const;

export const PLAYOFF_LABELS = {
  NONE: "None — the table decides it",
  BLOCK_WINNERS: "Final between the block winners",
  TOP_TWO_PER_BLOCK: "Semi-finals from the top two of each block",
  TOP_FOUR_OVERALL: "Bracket of the best four overall",
  TOP_EIGHT_OVERALL: "Bracket of the best eight overall",
} as const;

/** A, B, C … for however many blocks a league is split into. */
export function blockLetters(count: number): string[] {
  return Array.from({ length: Math.max(1, count) }, (_, i) => String.fromCharCode(65 + i));
}

export const TOURNAMENT_FORMAT_LABELS = {
  ROUND_ROBIN: "Round robin",
  SINGLE_ELIMINATION: "Single elimination",
} as const;

/**
 * Bracket rounds are named backwards from the end, so a round's name depends
 * on how many rounds there are — never stored, always counted.
 */
export function roundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semi-finals";
  if (fromEnd === 2) return "Quarter-finals";
  return `Round ${round}`;
}

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
