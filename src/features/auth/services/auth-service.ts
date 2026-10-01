import { prisma } from "@/lib/prisma";
import { getDatabaseUrl } from "@/lib/env";
import { ForbiddenError, NotFoundError } from "@/lib/api-response";
import type { LoginPayload, User } from "../types";
import type { TenantContext, TenantContextResolution } from "../types";
import { getAccessibleOutletForUser, getTenantContextForUser } from "./tenant-context-service";
import { verifyPassword } from "../utils/password";
import {
  createSessionToken,
  getSessionExpiresAt,
  hashSessionToken,
} from "../utils/session";

export interface LoginResult {
  sessionToken: string;
  user: User;
}

export interface TenantSessionResult {
  user: User;
  resolution: TenantContextResolution;
}

export class AuthServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthServiceError";
  }
}

export class InvalidCredentialsError extends AuthServiceError {
  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}

function assertDatabaseConfigured() {
  try {
    getDatabaseUrl();
  } catch {
    throw new AuthServiceError(
      "Database is not configured. Set DATABASE_URL, restart the dev server, then run the Prisma migration and seed.",
    );
  }
}

function toAuthUser(user: {
  id: string;
  name: string;
  email: string;
  role: User["role"];
}): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export const loginRequest = async ({
  email,
  password,
}: LoginPayload): Promise<LoginResult> => {
  assertDatabaseConfigured();

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user || !user.isActive) {
    throw new InvalidCredentialsError();
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    throw new InvalidCredentialsError();
  }

  const sessionToken = createSessionToken();
  const tokenHash = hashSessionToken(sessionToken);
  const expiresAt = getSessionExpiresAt();
  const previousSession = await prisma.session.findFirst({
    where: {
      userId: user.id,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      activeOrganizationId: { not: null },
      activeOutletId: { not: null },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { activeOrganizationId: true, activeOutletId: true },
  });
  const tenantResolution = await getTenantContextForUser(user.id, previousSession ? {
    organizationId: previousSession.activeOrganizationId,
    outletId: previousSession.activeOutletId,
  } : undefined);

  if (tenantResolution.status === "no_access") {
    throw new InvalidCredentialsError();
  }

  const tenantContext = tenantResolution.status === "ready" ? tenantResolution.context : null;

  await prisma.$transaction([
    prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        activeOrganizationId: tenantContext?.organizationId ?? null,
        activeOutletId: tenantContext?.outletId ?? null,
        expiresAt,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "auth.login",
        entityType: "user",
        entityId: user.id,
        organizationId: tenantContext?.organizationId,
        outletId: tenantContext?.outletId,
      },
    }),
  ]);

  return {
    sessionToken,
    user: toAuthUser(user),
  };
};

export const getUserBySessionToken = async (
  sessionToken: string,
): Promise<User | null> => {
  assertDatabaseConfigured();

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(sessionToken) },
    include: { user: true },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    !session.user.isActive
  ) {
    return null;
  }

  return toAuthUser(session.user);
};

export const getTenantSessionByToken = async (
  sessionToken: string,
): Promise<TenantSessionResult | null> => {
  assertDatabaseConfigured();
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(sessionToken) },
    include: { user: true },
  });

  if (
    !session || session.revokedAt || session.expiresAt <= new Date() ||
    !session.user.isActive
  ) return null;

  const resolution = await getTenantContextForUser(session.userId, {
    organizationId: session.activeOrganizationId,
    outletId: session.activeOutletId,
  });
  return { user: toAuthUser(session.user), resolution };
};

export const switchOutletRequest = async (
  sessionToken: string,
  outletId: string,
): Promise<TenantContext> => {
  assertDatabaseConfigured();
  const tokenHash = hashSessionToken(sessionToken);

  return prisma.$transaction(async (transaction) => {
    const session = await transaction.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (
      !session || session.revokedAt || session.expiresAt <= new Date() ||
      !session.user.isActive
    ) throw new ForbiddenError("Sign in is required.");

    const context = await getAccessibleOutletForUser(session.userId, outletId, transaction);
    if (!context) throw new NotFoundError("Outlet was not found.");

    await transaction.session.update({
      where: { id: session.id },
      data: {
        activeOrganizationId: context.organizationId,
        activeOutletId: context.outletId,
      },
    });
    await transaction.activityLog.create({
      data: {
        userId: session.userId,
        organizationId: context.organizationId,
        outletId: context.outletId,
        action: "auth.outlet.switch",
        entityType: "outlet",
        entityId: context.outletId,
      },
    });
    return context;
  });
};

export const logoutRequest = async (sessionToken: string): Promise<void> => {
  assertDatabaseConfigured();

  const tokenHash = hashSessionToken(sessionToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
  });

  if (!session || session.revokedAt) {
    return;
  }

  await prisma.$transaction([
    prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    }),
    prisma.activityLog.create({
      data: {
        userId: session.userId,
        action: "auth.logout",
        entityType: "session",
        entityId: session.id,
      },
    }),
  ]);
};
