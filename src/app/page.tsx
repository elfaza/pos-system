import type { Metadata } from "next";
import LoginForm from "@/features/auth/components/login-form";
import packageJson from "../../package.json";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function HomePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--background)] p-4">
      <LoginForm appVersion={packageJson.version} />
    </main>
  );
}
