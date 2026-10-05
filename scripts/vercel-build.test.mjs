import { describe, expect, it, vi } from "vitest";
import { runVercelBuild } from "./vercel-build.mjs";

describe("Vercel build migration isolation", () => {
  it.each(["preview", "development", undefined])(
    "does not migrate in %s builds",
    (environment) => {
      const run = vi.fn().mockReturnValue({ status: 0 });
      runVercelBuild({ VERCEL_ENV: environment, VERCEL_GIT_COMMIT_REF: "feature/tenancy" }, run);
      expect(run.mock.calls.map((call) => call[1])).toEqual([
        ["run", "prisma:generate"], ["run", "build"],
      ]);
    },
  );

  it("does not run database migrations in production builds", () => {
    const run = vi.fn().mockReturnValue({ status: 0 });
    runVercelBuild({ VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "master" }, run);
    expect(run.mock.calls.map((call) => call[1])).toEqual([
      ["run", "prisma:generate"], ["run", "build"],
    ]);
  });

  it.each(["feature/tenancy", undefined])(
    "blocks production from %s before running any command",
    (branch) => {
      const run = vi.fn();
      expect(() => runVercelBuild({ VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: branch }, run)).toThrow(
        "Production builds must use master.",
      );
      expect(run).not.toHaveBeenCalled();
    },
  );

  it("stops the build if a step fails", () => {
    const run = vi.fn().mockReturnValueOnce({ status: 0 }).mockReturnValueOnce({ status: 1 });
    expect(() => runVercelBuild({ VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "master" }, run)).toThrow(
      "build failed",
    );
    expect(run).toHaveBeenCalledTimes(2);
  });
});
