import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Queue",
};

export default function QueueLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
