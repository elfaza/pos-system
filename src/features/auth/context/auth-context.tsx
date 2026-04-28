"use client";

import { createContext, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  login as loginAction,
  logout as logoutAction,
} from "../actions/auth-actions";
import type { AuthState, LoginPayload, User } from "../types";

interface AuthContextType extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
  user,
  children,
}: {
  user: User | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(user);

  const login = async (payload: LoginPayload): Promise<void> => {
    setLoading(true);
    try {
      const result = await loginAction(payload);
      if (!result.ok) {
        throw new Error(result.error);
      }

      const authenticatedUser = result.user;
      setCurrentUser(authenticatedUser);
      router.push(authenticatedUser.role === "admin" ? `/dashboard` : `/pos`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await logoutAction();
      setCurrentUser(null);
      router.push(`/`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        loading,
        isAuthenticated: !!currentUser,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
