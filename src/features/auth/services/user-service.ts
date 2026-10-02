import type { UserRole as PrismaUserRole } from "@prisma/client";
import { ForbiddenError, ValidationError } from "@/lib/api-response";
import type { User, UserRole } from "@/features/auth/types";
import { listOutletMembers, saveOutletMember } from "@/features/organizations/services/membership-service";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function parseUserRole(value: unknown): PrismaUserRole {
  if (
    value === "admin" ||
    value === "cashier" ||
    value === "kitchen" ||
    value === "queue" ||
    value === "customer_facing_display"
  ) {
    return value;
  }

  throw new ValidationError("User validation failed.", {
    role: "Role must be admin, cashier, kitchen, queue, or customer facing display.",
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
  const members = await listOutletMembers();
  return members.map((membership) => ({
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
    isActive: membership.isActive,
    lastLoginAt: membership.user.lastLoginAt?.toISOString() ?? null,
    createdAt: membership.createdAt.toISOString(),
    updatedAt: membership.updatedAt.toISOString(),
  }));
}

export async function createUserFromPayload(
  payload: Record<string, unknown>,
  actor: User,
) {
  const data = parseUserPayload(payload, { requirePassword: false });
  const membership = await saveOutletMember(data, actor.id);
  return { id: membership.user.id, name: membership.user.name, email: membership.user.email, role: membership.role,
    isActive: membership.isActive, lastLoginAt: null, createdAt: membership.createdAt.toISOString(), updatedAt: membership.updatedAt.toISOString() };
}

export async function updateUserFromPayload(
  id: string,
  payload: Record<string, unknown>,
  actor: User,
) {
  const data = parseUserPayload(payload, { requirePassword: false });
  if (id === actor.id && !data.isActive) {
    throw new ForbiddenError("You cannot deactivate your own account.");
  }
  const membership = await saveOutletMember(data, actor.id, id);
  return { id: membership.user.id, name: membership.user.name, email: membership.user.email, role: membership.role,
    isActive: membership.isActive, lastLoginAt: membership.user.lastLoginAt?.toISOString() ?? null,
    createdAt: membership.createdAt.toISOString(), updatedAt: membership.updatedAt.toISOString() };
}
