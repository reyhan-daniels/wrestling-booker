import { createHmac, timingSafeEqual } from "node:crypto";

// Single-user tool: one shared password, one signed cookie. No accounts, no
// signup flow — just enough to keep the public URL from being an open door.

export const SESSION_COOKIE = "wb_session";
const SESSION_DAYS = 90;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set.");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Token is `issuedAt.signature` so a leaked cookie eventually stops working. */
export function createSessionToken(): string {
  const issuedAt = String(Date.now());
  return `${issuedAt}.${sign(issuedAt)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;

  const expected = sign(issuedAt);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const age = Date.now() - Number(issuedAt);
  return Number.isFinite(age) && age >= 0 && age < SESSION_DAYS * 86_400_000;
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) throw new Error("APP_PASSWORD is not set.");
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const SESSION_MAX_AGE = SESSION_DAYS * 86_400;
