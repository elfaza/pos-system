import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/features/auth/context/auth-context";
import { getUser } from "@/features/auth/actions/auth-actions";

export const metadata: Metadata = {
  title: `POS System`,
  description: `Single-store cafe POS`,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider user={user}>{children}</AuthProvider>
      </body>
    </html>
  );
}
