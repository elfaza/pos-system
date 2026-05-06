import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/context/auth-context";
import { getUser } from "@/features/auth/actions/auth-actions";
import type { ModuleAvailability } from "@/features/auth/types";
import { getAppSettings } from "@/features/catalog/services/settings-service";

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
  description: "Single-store cafe POS",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();
  let moduleAvailability: ModuleAvailability | null = null;

  if (user) {
    const settings = await getAppSettings();
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
        <AuthProvider user={user} moduleAvailability={moduleAvailability}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
