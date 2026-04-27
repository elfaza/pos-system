import { createHash, randomBytes } from "node:crypto";

const DEFAULT_SESSION_DAYS = 7;

export const AUTH_COOKIE = "pos_session";

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionExpiresAt(): Date {
  const configuredDays = Number(process.env.AUTH_SESSION_DAYS);
  const days = configuredDays > 0 ? configuredDays : DEFAULT_SESSION_DAYS;

  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
