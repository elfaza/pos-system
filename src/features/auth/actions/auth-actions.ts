"use server";

import { cookies } from "next/headers";
import {
  AuthServiceError,
  getUserBySessionToken,
  loginRequest,
  logoutRequest,
} from "../services/auth-service";
import type { LoginPayload, User } from "../types";
import { AUTH_COOKIE } from "../utils/session";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === `production`,
  sameSite: `lax` as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: `/`,
};

function isDatabaseConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("Can't reach database server") ||
    error.message.includes("Error querying the database")
  );
}

export async function login(payload: LoginPayload): Promise<User> {
  try {
    const { sessionToken, user } = await loginRequest(payload);
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE, sessionToken, COOKIE_OPTIONS);

    return user;
  } catch (error) {
    if (error instanceof AuthServiceError) {
      throw new Error(error.message);
    }

    console.error("Login failed", error);
    if (isDatabaseConnectionError(error)) {
      throw new Error(
        "Database server is not running. Start PostgreSQL on localhost:5432, then run migration and seed.",
      );
    }

    throw new Error(
      "Unable to sign in. Check the database connection and account credentials.",
    );
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_COOKIE)?.value;
  if (sessionToken) {
    try {
      await logoutRequest(sessionToken);
    } catch (error) {
      console.error("Logout failed", error);
    }
  }
  cookieStore.delete(AUTH_COOKIE);
}

export async function getUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_COOKIE)?.value;
  if (!sessionToken) return null;

  try {
    return await getUserBySessionToken(sessionToken);
  } catch (error) {
    console.error("Session lookup failed", error);
    return null;
  }
}
