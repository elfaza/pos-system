"use client";

import { useState } from "react";
import { getDefaultRouteForEffectiveRole } from "@/features/auth/utils/role-routes";
import { useCartStore } from "@/features/checkout/stores/cart-store";

export function useOutletSwitch() {
  const [pendingOutletId, setPendingOutletId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function switchOutlet(outletId: string) {
    setPendingOutletId(outletId);
    setError(null);
    try {
      const response = await fetch("/api/session/outlet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outletId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not switch outlet.");

      // The server revalidates the requested outlet against this session's memberships.
      useCartStore.getState().clearCart();
      window.location.replace(getDefaultRouteForEffectiveRole(result.role));
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : "Could not switch outlet.");
      setPendingOutletId(null);
    }
  }

  return { switchOutlet, pendingOutletId, error };
}
