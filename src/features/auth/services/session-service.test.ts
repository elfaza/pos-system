import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "@/lib/api-response";
import {
  getCurrentTenantContext,
  getCurrentTenantSession,
  getCurrentUser,
  requireTenantContext,
  requireUser,
  switchCurrentOutlet,
} from "./session-service";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  getTenantSessionByToken: vi.fn(),
  getUserBySessionToken: vi.fn(),
  switchOutletRequest: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("./auth-service", () => ({
  getTenantSessionByToken: mocks.getTenantSessionByToken,
  getUserBySessionToken: mocks.getUserBySessionToken,
  switchOutletRequest: mocks.switchOutletRequest,
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

  it("returns tenant session context resolved from the opaque session token", async () => {
    const context = { userId: "user-1", organizationId: "org-1", outletId: "outlet-1", role: "owner" as const };
    mocks.cookies.mockResolvedValue({ get: vi.fn().mockReturnValue({ value: "session-token" }) });
    mocks.getTenantSessionByToken.mockResolvedValue({ user: adminUser, resolution: { status: "ready", context, outlets: [] } });

    await expect(getCurrentTenantSession()).resolves.toMatchObject({ resolution: { status: "ready", context } });
    await expect(getCurrentTenantContext()).resolves.toEqual(context);
    expect(mocks.getTenantSessionByToken).toHaveBeenCalledWith("session-token");
  });

  it("requires an outlet selection before returning tenant context", async () => {
    mocks.cookies.mockResolvedValue({ get: vi.fn().mockReturnValue({ value: "session-token" }) });
    mocks.getTenantSessionByToken.mockResolvedValue({
      user: adminUser,
      resolution: { status: "outlet_required", outlets: [] },
    });

    await expect(requireTenantContext()).rejects.toMatchObject(
      new ForbiddenError("Choose an outlet to continue."),
    );
  });

  it("enforces tenant-scoped roles and switches the current session outlet", async () => {
    const context = { userId: "user-1", organizationId: "org-1", outletId: "outlet-1", role: "cashier" as const };
    mocks.cookies.mockResolvedValue({ get: vi.fn().mockReturnValue({ value: "session-token" }) });
    mocks.getTenantSessionByToken.mockResolvedValue({ user: adminUser, resolution: { status: "ready", context, outlets: [] } });
    mocks.switchOutletRequest.mockResolvedValue(context);

    await expect(requireTenantContext(["cashier"])).resolves.toEqual(context);
    await expect(requireTenantContext(["kitchen"])).rejects.toBeInstanceOf(ForbiddenError);
    await expect(switchCurrentOutlet("outlet-2")).resolves.toEqual(context);
    expect(mocks.switchOutletRequest).toHaveBeenCalledWith("session-token", "outlet-2");
  });
});
