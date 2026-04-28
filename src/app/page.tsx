import LoginForm from "@/features/auth/components/login-form";
import packageJson from "../../package.json";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--background)] p-4">
      <LoginForm appVersion={packageJson.version} />
    </main>
  );
}
