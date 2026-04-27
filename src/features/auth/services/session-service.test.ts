import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "@/lib/api-response";
import { getCurrentUser, requireUser } from "./session-service";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  getUserBySessionToken: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("./auth-service", () => ({
  getUserBySessionToken: mocks.getUserBySessionToken,
}));

const adminUser = {
  id: "admin-1",
  name: "Admin",
  email: "admin@pos.local",
  role: "admin" as const,
};

describe("session service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no session cookie exists", async () => {
    mocks.cookies.mockResolvedValue({ get: vi.fn().mockReturnValue(undefined) });

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.getUserBySessionToken).not.toHaveBeenCalled();
  });

  it("loads the current user from the session cookie", async () => {
    mocks.cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "session-token" }),
    });
    mocks.getUserBySessionToken.mockResolvedValue(adminUser);

    await expect(getCurrentUser()).resolves.toEqual(adminUser);
    expect(mocks.getUserBySessionToken).toHaveBeenCalledWith("session-token");
  });

  it("requires a signed-in user", async () => {
    mocks.cookies.mockResolvedValue({ get: vi.fn().mockReturnValue(undefined) });

    await expect(requireUser()).rejects.toMatchObject(
      new ForbiddenError("Sign in is required."),
    );
  });

  it("rejects users outside the allowed roles", async () => {
    mocks.cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "session-token" }),
    });
    mocks.getUserBySessionToken.mockResolvedValue({
      ...adminUser,
      role: "cashier",
    });

    await expect(requireUser(["admin"])).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns users with an allowed role", async () => {
    mocks.cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "session-token" }),
    });
    mocks.getUserBySessionToken.mockResolvedValue(adminUser);

    await expect(requireUser(["admin"])).resolves.toEqual(adminUser);
  });
});
