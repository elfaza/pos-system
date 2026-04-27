import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  InvalidCredentialsError,
  loginRequest,
  getUserBySessionToken,
} from "./auth-service";

const mocks = vi.hoisted(() => ({
  activityLogCreate: vi.fn(),
  createSessionToken: vi.fn(),
  hashSessionToken: vi.fn(),
  sessionCreate: vi.fn(),
  sessionFindUnique: vi.fn(),
  transaction: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    activityLog: { create: mocks.activityLogCreate },
    session: {
      create: mocks.sessionCreate,
      findUnique: mocks.sessionFindUnique,
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
    mocks.createSessionToken.mockReturnValue("session-token");
    mocks.hashSessionToken.mockReturnValue("session-hash");
    mocks.transaction.mockResolvedValue(undefined);
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
        expiresAt: new Date("2026-05-04T00:00:00.000Z"),
      },
    });
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
});
