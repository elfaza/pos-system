import { prisma } from "@/lib/prisma";
import type { LoginPayload, User } from "../types";
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
  if (!process.env.DATABASE_URL) {
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

  await prisma.$transaction([
    prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
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
