import { parseISODate } from "@/lib/dates";

/** Small helpers so every action reads form data the same way. */

export function text(data: FormData, key: string): string | null {
  const value = data.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function requiredText(data: FormData, key: string, label = key): string {
  const value = text(data, key);
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

export function bool(data: FormData, key: string): boolean {
  const value = data.get(key);
  return value === "on" || value === "true" || value === "1";
}

export function date(data: FormData, key: string): Date | null {
  const value = text(data, key);
  return value ? parseISODate(value) : null;
}

export function requiredDate(data: FormData, key: string, label = key): Date {
  const value = date(data, key);
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

export function list(data: FormData, key: string): string[] {
  return data
    .getAll(key)
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function integer(data: FormData, key: string): number | null {
  const value = text(data, key);
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
