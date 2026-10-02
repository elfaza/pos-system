import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthContext } from "@/features/auth/context/auth-context";
import type { TenantContextResolution } from "@/features/auth/types";
import OutletSwitcher from "./outlet-switcher";

function markup(tenantResolution: TenantContextResolution) {
  return renderToStaticMarkup(createElement(
    AuthContext.Provider,
    { value: { tenantResolution } as never },
    createElement(OutletSwitcher),
  ));
}

describe("OutletSwitcher", () => {
  it("stays hidden for a single accessible outlet", () => {
    expect(markup({
      status: "ready",
      context: { userId: "user-1", organizationId: "org-1", outletId: "outlet-1", role: "admin" },
      outlets: [{ organizationId: "org-1", organizationName: "Cafe Group", outletId: "outlet-1", outletName: "Central", role: "admin" }],
    })).toBe("");
  });

  it("shows only server-resolved outlet options when switching is available", () => {
    const html = markup({
      status: "ready",
      context: { userId: "user-1", organizationId: "org-1", outletId: "outlet-1", role: "owner" },
      outlets: [
        { organizationId: "org-1", organizationName: "Cafe Group", outletId: "outlet-1", outletName: "Central", role: "owner" },
        { organizationId: "org-1", organizationName: "Cafe Group", outletId: "outlet-2", outletName: "Harbor", role: "owner" },
      ],
    });
    expect(html).toContain("Active outlet");
    expect(html).toContain("Central");
    expect(html).toContain("Harbor");
    expect(html).toContain('value="outlet-1" selected');
  });
});
