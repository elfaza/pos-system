import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  InvalidCredentialsError,
  loginRequest,
  getUserBySessionToken,
  switchOutletRequest,
} from "./auth-service";

const mocks = vi.hoisted(() => ({
  activityLogCreate: vi.fn(),
  createSessionToken: vi.fn(),
  hashSessionToken: vi.fn(),
  organizationMembershipFindMany: vi.fn(),
  outletMembershipFindMany: vi.fn(),
  sessionCreate: vi.fn(),
  sessionFindFirst: vi.fn(),
  sessionFindUnique: vi.fn(),
  sessionUpdate: vi.fn(),
  transaction: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    activityLog: { create: mocks.activityLogCreate },
    organizationMembership: { findMany: mocks.organizationMembershipFindMany },
    outletMembership: { findMany: mocks.outletMembershipFindMany },
    session: {
      create: mocks.sessionCreate,
      findFirst: mocks.sessionFindFirst,
      findUnique: mocks.sessionFindUnique,
      update: mocks.sessionUpdate,
    },
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("../utils/password", () => ({
  verifyPassword: mocks.verifyPassword,
}));

vi.mock("../utils/session", () => ({
  createSessionToken: mocks.createSessionToken,
  getSessionExpiresAt: () => new Date("2026-05-04T00:00:00.000Z"),
  hashSessionToken: mocks.hashSessionToken,
}));

const activeUser = {
  id: "user-1",
  name: "Admin User",
  email: "admin@pos.local",
  role: "admin" as const,
  isActive: true,
  passwordHash: "hash",
};

describe("auth service", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://test";
    vi.clearAllMocks();
    mocks.organizationMembershipFindMany.mockResolvedValue([{
      organizationId: "org-1", role: "owner", isActive: true,
      organization: {
        id: "org-1", name: "Cafe", isActive: true,
        outlets: [{ id: "outlet-1", name: "Main", isActive: true }],
      },
    }]);
    mocks.outletMembershipFindMany.mockResolvedValue([]);
    mocks.sessionFindFirst.mockResolvedValue(null);
    mocks.createSessionToken.mockReturnValue("session-token");
    mocks.hashSessionToken.mockReturnValue("session-hash");
    mocks.transaction.mockImplementation((callbackOrOperations: unknown) => {
      if (typeof callbackOrOperations === "function") {
        return callbackOrOperations({
          $queryRaw: vi.fn().mockResolvedValue([]),
          activityLog: { create: mocks.activityLogCreate },
          organizationMembership: { findMany: mocks.organizationMembershipFindMany },
          outletMembership: { findMany: mocks.outletMembershipFindMany },
          session: { findUnique: mocks.sessionFindUnique, update: mocks.sessionUpdate },
        });
      }
      return Promise.resolve(undefined);
    });
  });

  it("logs in active users with normalized email and creates a session", async () => {
    mocks.userFindUnique.mockResolvedValue(activeUser);
    mocks.verifyPassword.mockResolvedValue(true);

    await expect(
      loginRequest({ email: " Admin@POS.Local ", password: "secret" }),
    ).resolves.toEqual({
      sessionToken: "session-token",
      user: {
        id: "user-1",
        name: "Admin User",
        email: "admin@pos.local",
        role: "admin",
      },
    });

    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { email: "admin@pos.local" },
    });
    expect(mocks.sessionCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        tokenHash: "session-hash",
        activeOrganizationId: "org-1",
        activeOutletId: "outlet-1",
        expiresAt: new Date("2026-05-04T00:00:00.000Z"),
      },
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(3);
  });

  it("does not reuse an old session selection that is no longer authorized", async () => {
    mocks.userFindUnique.mockResolvedValue(activeUser);
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.sessionFindFirst.mockResolvedValue({
      activeOrganizationId: "org-foreign",
      activeOutletId: "outlet-foreign",
    });

    await loginRequest({ email: activeUser.email, password: "secret" });

    expect(mocks.sessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        activeOrganizationId: "org-1",
        activeOutletId: "outlet-1",
      }),
    });
  });

  it("requires outlet selection when a valid prior outlet is unavailable for a multi-outlet user", async () => {
    mocks.userFindUnique.mockResolvedValue(activeUser);
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.organizationMembershipFindMany.mockResolvedValue([{
      organizationId: "org-1", role: "owner", isActive: true,
      organization: {
        id: "org-1", name: "Cafe", isActive: true,
        outlets: [
          { id: "outlet-1", name: "Main", isActive: true },
          { id: "outlet-2", name: "Branch", isActive: true },
        ],
      },
    }]);
    mocks.sessionFindFirst.mockResolvedValue(null);

    await loginRequest({ email: activeUser.email, password: "secret" });

    expect(mocks.sessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ activeOrganizationId: null, activeOutletId: null }),
    });
  });

  it("rejects an active identity that has no active tenant membership", async () => {
    mocks.userFindUnique.mockResolvedValue(activeUser);
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.organizationMembershipFindMany.mockResolvedValue([]);
    mocks.outletMembershipFindMany.mockResolvedValue([]);

    await expect(loginRequest({ email: activeUser.email, password: "secret" })).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("rejects inactive users without checking the password", async () => {
    mocks.userFindUnique.mockResolvedValue({ ...activeUser, isActive: false });

    await expect(
      loginRequest({ email: "admin@pos.local", password: "secret" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
  });

  it("rejects invalid passwords", async () => {
    mocks.userFindUnique.mockResolvedValue(activeUser);
    mocks.verifyPassword.mockResolvedValue(false);

    await expect(
      loginRequest({ email: "admin@pos.local", password: "wrong" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("returns null for revoked, expired, inactive, or missing sessions", async () => {
    mocks.sessionFindUnique.mockResolvedValueOnce(null);
    await expect(getUserBySessionToken("missing")).resolves.toBeNull();

    mocks.sessionFindUnique.mockResolvedValueOnce({
      revokedAt: new Date(),
      expiresAt: new Date("2026-05-04T00:00:00.000Z"),
      user: activeUser,
    });
    await expect(getUserBySessionToken("revoked")).resolves.toBeNull();

    mocks.sessionFindUnique.mockResolvedValueOnce({
      revokedAt: null,
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      user: activeUser,
    });
    await expect(getUserBySessionToken("expired")).resolves.toBeNull();

    mocks.sessionFindUnique.mockResolvedValueOnce({
      revokedAt: null,
      expiresAt: new Date("2026-05-04T00:00:00.000Z"),
      user: { ...activeUser, isActive: false },
    });
    await expect(getUserBySessionToken("inactive")).resolves.toBeNull();
  });

  it("switches to an authorized outlet and records the selected tenant", async () => {
    mocks.sessionFindUnique.mockResolvedValue({
      id: "session-1", userId: activeUser.id, revokedAt: null,
      expiresAt: new Date("2099-01-01T00:00:00.000Z"), user: activeUser,
    });
    mocks.organizationMembershipFindMany.mockResolvedValue([]);
    mocks.outletMembershipFindMany.mockResolvedValue([{
      organizationId: "org-2", outletId: "outlet-2", role: "cashier", isActive: true,
      outlet: {
        id: "outlet-2", name: "Branch", isActive: true,
        organization: { id: "org-2", name: "Cafe", isActive: true },
      },
    }]);

    await expect(switchOutletRequest("session-token", "outlet-2")).resolves.toEqual({
      userId: "user-1", organizationId: "org-2", outletId: "outlet-2", role: "cashier",
    });
    expect(mocks.sessionUpdate).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: { activeOrganizationId: "org-2", activeOutletId: "outlet-2" },
    });
    expect(mocks.activityLogCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: "auth.outlet.switch", organizationId: "org-2", outletId: "outlet-2",
    }) });
  });

  it("does not update a session when switching to a foreign outlet", async () => {
    mocks.sessionFindUnique.mockResolvedValue({
      id: "session-1", userId: activeUser.id, revokedAt: null,
      expiresAt: new Date("2099-01-01T00:00:00.000Z"), user: activeUser,
    });
    mocks.organizationMembershipFindMany.mockResolvedValue([]);
    mocks.outletMembershipFindMany.mockResolvedValue([]);

    const { NotFoundError } = await import("@/lib/api-response");
    await expect(switchOutletRequest("session-token", "foreign-outlet")).rejects.toBeInstanceOf(NotFoundError);
    expect(mocks.sessionUpdate).not.toHaveBeenCalled();
    expect(mocks.activityLogCreate).not.toHaveBeenCalled();
  });
});
