"use client";

import { useEffect, useState, SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/use-auth";

type LoginFormProps = {
  appVersion: string;
};

export default function LoginForm({ appVersion }: LoginFormProps) {
  const router = useRouter();
  const { login, loading, user } = useAuth();

  const [email, setEmail] = useState(``);
  const [password, setPassword] = useState(``);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    router.replace(user.role === "admin" ? "/dashboard" : "/pos");
  }, [router, user]);

  const handleSubmit = async (
    e: SyntheticEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    setError(null);
    try {
      await login({ email, password });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to sign in. Try again.",
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4 rounded-md border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
    >
      <div>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Use an active admin or cashier account.
        </p>
      </div>

      {error ? (
        <p className="max-h-36 overflow-y-auto break-words rounded-md border border-[var(--danger)]/30 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <label className="grid gap-1 text-sm font-medium">
        Email
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@pos.local"
          type="email"
          required
          className="h-11 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        />
      </label>

      <label className="grid gap-1 text-sm font-medium">
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="h-11 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        />
      </label>

      <button
        disabled={loading}
        className="h-11 rounded-md bg-[var(--primary)] px-4 font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? `Signing in...` : `Sign in`}
      </button>

      <p className="text-center text-xs text-[var(--muted-foreground)]">
        Version {appVersion}
      </p>
    </form>
  );
}
