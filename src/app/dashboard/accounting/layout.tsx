import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accounting",
};

export default function AccountingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
