import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/context/auth-context";
import type { ModuleAvailability } from "@/features/auth/types";
import { getAppSettings } from "@/features/catalog/services/settings-service";
import { getCurrentTenantSession } from "@/features/auth/services/session-service";
import type { TenantContextResolution } from "@/features/auth/types";
import TenantExperience from "@/features/organizations/components/tenant-experience";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "POS System",
    template: "%s | POS System",
  },
  description: "Multi-outlet cafe POS and operations workspace",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tenantSession = await getCurrentTenantSession();
  const user = tenantSession?.user ?? null;
  const tenantResolution: TenantContextResolution = tenantSession?.resolution ?? { status: "no_access", outlets: [] };
  let moduleAvailability: ModuleAvailability | null = null;

  if (tenantResolution.status === "ready") {
    const settings = await getAppSettings(tenantResolution.context);
    moduleAvailability = {
      kitchenEnabled: settings.kitchenEnabled,
      queueEnabled: settings.queueEnabled,
      inventoryEnabled: settings.inventoryEnabled,
      accountingEnabled: settings.accountingEnabled,
    };
  }

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider
          key={`${user?.id ?? "anonymous"}:${tenantResolution.status}:${tenantResolution.status === "ready" ? tenantResolution.context.outletId : ""}`}
          user={user}
          moduleAvailability={moduleAvailability}
          tenantResolution={tenantResolution}
        >
          <TenantExperience>{children}</TenantExperience>
        </AuthProvider>
      </body>
    </html>
  );
}
