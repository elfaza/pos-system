import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team",
};

export default function UsersLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
