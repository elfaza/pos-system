"use client";

import { createContext, useState, ReactNode } from "react";
import {
  login as loginAction,
  logout as logoutAction,
} from "../actions/auth-actions";
import type { AuthState, LoginPayload, ModuleAvailability, TenantContextResolution, User } from "../types";
import { getDefaultRouteForRole } from "../utils/role-routes";

interface AuthContextType extends AuthState {
  moduleAvailability: ModuleAvailability | null;
  loggingOut: boolean;
  tenantResolution: TenantContextResolution;
  setModuleAvailability: (moduleAvailability: ModuleAvailability | null) => void;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
  user,
  moduleAvailability,
  tenantResolution,
  children,
}: {
  user: User | null;
  moduleAvailability: ModuleAvailability | null;
  tenantResolution: TenantContextResolution;
  children: ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [currentModuleAvailability, setCurrentModuleAvailability] =
    useState<ModuleAvailability | null>(moduleAvailability);
  const [currentTenantResolution] = useState(tenantResolution);

  const login = async (payload: LoginPayload): Promise<void> => {
    setLoading(true);
    try {
      const result = await loginAction(payload);
      if (!result.ok) {
        throw new Error(result.error);
      }

      window.location.replace(getDefaultRouteForRole(result.user.role));
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    setLoggingOut(true);
    try {
      await logoutAction();
      window.location.replace(`/`);
    } catch (error) {
      setLoggingOut(false);
      setLoading(false);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        moduleAvailability: currentModuleAvailability,
        loggingOut,
        tenantResolution: currentTenantResolution,
        setModuleAvailability: setCurrentModuleAvailability,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
