import { cookies } from "next/headers";
import { ForbiddenError } from "@/lib/api-response";
import { getTenantSessionByToken, getUserBySessionToken, switchOutletRequest } from "./auth-service";
import type { EffectiveRole, TenantContext, User, UserRole } from "../types";
import { AUTH_COOKIE } from "../utils/session";
import { isTenantRoleAllowed } from "./tenant-role-policy";

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_COOKIE)?.value;
  if (!sessionToken) {
    return null;
  }

  return getUserBySessionToken(sessionToken);
}

export async function requireUser(allowedRoles?: UserRole[]): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new ForbiddenError("Sign in is required.");
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new ForbiddenError();
  }

  return user;
}

export async function getCurrentTenantSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_COOKIE)?.value;
  if (!sessionToken) return null;
  return getTenantSessionByToken(sessionToken);
}

export async function getCurrentTenantContext(): Promise<TenantContext | null> {
  const session = await getCurrentTenantSession();
  if (!session || session.resolution.status !== "ready") return null;
  return session.resolution.context;
}

export async function requireTenantContext(
  allowedRoles?: readonly EffectiveRole[],
): Promise<TenantContext> {
  const session = await getCurrentTenantSession();
  if (!session) throw new ForbiddenError("Sign in is required.");
  if (session.resolution.status === "outlet_required") {
    throw new ForbiddenError("Choose an outlet to continue.");
  }
  if (session.resolution.status === "no_access") {
    throw new ForbiddenError();
  }

  const { context } = session.resolution;
  if (allowedRoles && !isTenantRoleAllowed(context.role, allowedRoles)) {
    throw new ForbiddenError();
  }
  return context;
}

export async function switchCurrentOutlet(outletId: string): Promise<TenantContext> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_COOKIE)?.value;
  if (!sessionToken) throw new ForbiddenError("Sign in is required.");
  return switchOutletRequest(sessionToken, outletId);
}
