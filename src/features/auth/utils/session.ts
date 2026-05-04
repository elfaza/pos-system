import { createHash, randomBytes } from "node:crypto";
import { getAuthSessionDays } from "@/lib/env";

export const AUTH_COOKIE = "pos_session";

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionExpiresAt(): Date {
  const days = getAuthSessionDays();

  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
