import { afterEach, describe, expect, it } from "vitest";
import {
  EnvironmentConfigurationError,
  getAuthSessionDays,
  getDatabaseUrl,
} from "./env";

const originalEnv = process.env;

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("environment helpers", () => {
  it("requires a configured database URL", () => {
    delete process.env.DATABASE_URL;

    expect(() => getDatabaseUrl()).toThrow(EnvironmentConfigurationError);
  });

  it("returns the configured database URL", () => {
    process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/pos";

    expect(getDatabaseUrl()).toBe("postgresql://user:password@localhost:5432/pos");
  });

  it("defaults auth session days to seven", () => {
    delete process.env.AUTH_SESSION_DAYS;

    expect(getAuthSessionDays()).toBe(7);
  });

  it("rejects invalid auth session days", () => {
    process.env.AUTH_SESSION_DAYS = "0";

    expect(() => getAuthSessionDays()).toThrow(EnvironmentConfigurationError);
  });
});
