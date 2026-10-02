import { describe, expect, it } from "vitest";
import {
  getDefaultRouteForEffectiveRole,
  getDefaultRouteForRole,
  getRoleLabel,
  isDisplayRole,
} from "./role-routes";

describe("role routes", () => {
  it("maps roles to their default home routes", () => {
    expect(getDefaultRouteForRole("admin")).toBe("/dashboard");
    expect(getDefaultRouteForRole("cashier")).toBe("/pos");
    expect(getDefaultRouteForRole("kitchen")).toBe("/kitchen");
    expect(getDefaultRouteForRole("queue")).toBe("/queue");
    expect(getDefaultRouteForRole("customer_facing_display")).toBe("/customer-display");
    expect(getDefaultRouteForEffectiveRole("owner")).toBe("/dashboard");
    expect(getDefaultRouteForEffectiveRole("kitchen")).toBe("/kitchen");
  });

  it("labels display roles", () => {
    expect(getRoleLabel("kitchen")).toBe("Kitchen");
    expect(isDisplayRole("kitchen")).toBe(true);
    expect(isDisplayRole("cashier")).toBe(false);
  });
});
