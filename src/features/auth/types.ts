export type UserRole =
  | "admin"
  | "cashier"
  | "kitchen"
  | "queue"
  | "customer_facing_display";

export type OrganizationRole = "owner" | "admin";

export type OutletRole = UserRole;

export type EffectiveRole = "owner" | UserRole;

export interface TenantContext {
  userId: string;
  organizationId: string;
  outletId: string;
  role: EffectiveRole;
}

export interface AccessibleOutlet {
  organizationId: string;
  organizationName: string;
  outletId: string;
  outletName: string;
  role: EffectiveRole;
}

export type TenantContextResolution =
  | { status: "ready"; context: TenantContext; outlets: AccessibleOutlet[] }
  | { status: "outlet_required"; outlets: AccessibleOutlet[] }
  | { status: "no_access"; outlets: [] };

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export interface ModuleAvailability {
  kitchenEnabled: boolean;
  queueEnabled: boolean;
  inventoryEnabled: boolean;
  accountingEnabled: boolean;
}
