import { afterEach, describe, expect, it, vi } from "vitest";
import { EnvironmentConfigurationError } from "@/lib/env";
import { getSessionExpiresAt, hashSessionToken } from "./session";

describe("session utilities", () => {
  afterEach(() => {
    vi.useRealTimers();
    delete process.env.AUTH_SESSION_DAYS;
  });

  it("hashes session tokens consistently without exposing the token", () => {
    const hash = hashSessionToken("plain-token");

    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashSessionToken("plain-token"));
    expect(hash).not.toContain("plain-token");
  });

  it("uses the configured session expiry window when valid", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-27T00:00:00.000Z"));
    process.env.AUTH_SESSION_DAYS = "2";

    expect(getSessionExpiresAt().toISOString()).toBe("2026-04-29T00:00:00.000Z");
  });

  it("rejects invalid expiry configuration", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-27T00:00:00.000Z"));
    process.env.AUTH_SESSION_DAYS = "0";

    expect(() => getSessionExpiresAt()).toThrow(EnvironmentConfigurationError);
  });
});
