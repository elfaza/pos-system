import { cookies } from "next/headers";
import { ForbiddenError } from "@/lib/api-response";
import { getUserBySessionToken } from "./auth-service";
import type { User, UserRole } from "../types";
import { AUTH_COOKIE } from "../utils/session";

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
