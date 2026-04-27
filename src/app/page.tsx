import LoginForm from "@/features/auth/components/login-form";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--background)] p-4">
      <LoginForm />
    </main>
  );
}
