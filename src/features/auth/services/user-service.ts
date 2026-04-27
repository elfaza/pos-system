import type { UserRole as PrismaUserRole } from "@prisma/client";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import type { User } from "@/features/auth/types";
import { hashPassword } from "../utils/password";
import {
  createUser,
  findUserById,
  listUsers,
  updateUser,
} from "../repositories/user-repository";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: "admin" | "cashier";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapUserRecord(user: {
  id: string;
  name: string;
  email: string;
  role: PrismaUserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): UserRecord {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function parseUserRole(value: unknown): PrismaUserRole {
  if (value === "admin" || value === "cashier") {
    return value;
  }

  throw new ValidationError("User validation failed.", {
    role: "Role must be admin or cashier.",
  });
}

function parseUserPayload(
  payload: Record<string, unknown>,
  options: { requirePassword: boolean },
) {
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const role = parseUserRole(payload.role);
  const isActive =
    typeof payload.isActive === "boolean" ? payload.isActive : true;
  const password = typeof payload.password === "string" ? payload.password : "";
  const fieldErrors: Record<string, string> = {};

  if (!name) fieldErrors.name = "Name is required.";
  if (!email || !email.includes("@")) {
    fieldErrors.email = "A valid email is required.";
  }
  if (options.requirePassword && password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters.";
  }
  if (!options.requirePassword && password && password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError("User validation failed.", fieldErrors);
  }

  return { name, email, role, isActive, password };
}

export async function getUserList() {
  const users = await listUsers();
  return users.map(mapUserRecord);
}

export async function createUserFromPayload(
  payload: Record<string, unknown>,
  actor: User,
) {
  const data = parseUserPayload(payload, { requirePassword: true });
  const user = await createUser({
    name: data.name,
    email: data.email,
    role: data.role,
    isActive: data.isActive,
    passwordHash: await hashPassword(data.password),
  });

  await prisma.activityLog.create({
    data: {
      userId: actor.id,
      action: "user.created",
      entityType: "user",
      entityId: user.id,
      metadata: { role: user.role },
    },
  });

  return mapUserRecord(user);
}

export async function updateUserFromPayload(
  id: string,
  payload: Record<string, unknown>,
  actor: User,
) {
  const existing = await findUserById(id);
  if (!existing) {
    throw new NotFoundError("User was not found.");
  }

  const data = parseUserPayload(payload, { requirePassword: false });
  if (id === actor.id && !data.isActive) {
    throw new ForbiddenError("You cannot deactivate your own account.");
  }

  const passwordHash = data.password
    ? await hashPassword(data.password)
    : undefined;
  const user = await updateUser(id, {
    name: data.name,
    email: data.email,
    role: data.role,
    isActive: data.isActive,
    ...(passwordHash ? { passwordHash } : {}),
  });

  await prisma.activityLog.create({
    data: {
      userId: actor.id,
      action: "user.updated",
      entityType: "user",
      entityId: user.id,
      metadata: {
        role: user.role,
        isActive: user.isActive,
        passwordChanged: Boolean(passwordHash),
      },
    },
  });

  return mapUserRecord(user);
}
