// Every date in this app is a calendar date, never a moment in time. Postgres
// stores them as `date` and Prisma hands them back as UTC midnight, so all
// reading and writing goes through UTC to keep the day from drifting when the
// phone and the server disagree about timezone.

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseISODate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function weekdayName(date: Date): string {
  return WEEKDAYS[date.getUTCDay()];
}

/** "Sat 12 Apr 2025" — compact enough for a phone. */
export function formatDate(date: Date): string {
  return `${WEEKDAYS[date.getUTCDay()].slice(0, 3)} ${date.getUTCDate()} ${MONTHS[
    date.getUTCMonth()
  ].slice(0, 3)} ${date.getUTCFullYear()}`;
}

export function formatDateLong(date: Date): string {
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${
    MONTHS[date.getUTCMonth()]
  } ${date.getUTCFullYear()}`;
}

export function formatMonth(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Whole days between two calendar dates. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** "1 year, 34 days" — how a reign length reads. */
export function formatDuration(days: number): string {
  if (days <= 0) return "0 days";
  const years = Math.floor(days / 365);
  const rest = days % 365;
  const parts: string[] = [];
  if (years) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (rest || !years) parts.push(`${rest} day${rest === 1 ? "" : "s"}`);
  return parts.join(", ");
}
