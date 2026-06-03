import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Display",
};

export default function CustomerDisplayLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
