import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kitchen",
};

export default function KitchenLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
