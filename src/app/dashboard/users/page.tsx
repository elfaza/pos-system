"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AdminShell from "@/features/admin/components/admin-shell";
import type { UserRecord } from "@/features/auth/services/user-service";

const emptyForm = {
  id: "",
  name: "",
  email: "",
  role: "cashier" as "admin" | "cashier",
  isActive: true,
  password: "",
};

type UserForm = typeof emptyForm;

function statusClassName(isActive: boolean) {
  return isActive
    ? "bg-green-50 text-[var(--success)]"
    : "bg-slate-100 text-[var(--muted-foreground)]";
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const editing = useMemo(() => Boolean(form.id), [form.id]);

  async function loadUsers() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/users");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load users.");
      }

      setUsers(data.users);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  function editUser(user: UserRecord) {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      password: "",
    });
    setMessage(null);
  }

  function resetForm() {
    setForm(emptyForm);
    setMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(editing ? `/api/users/${form.id}` : "/api/users", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save user.");
      }

      setForm(emptyForm);
      setMessage(editing ? "User updated." : "User created.");
      await loadUsers();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Users" eyebrow="Admin access">
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="rounded-md border border-[var(--border)] bg-[var(--card)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
            <div>
              <h2 className="font-semibold">User list</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Active admin and cashier accounts can sign in.
              </p>
            </div>
            <button
              onClick={() => void loadUsers()}
              disabled={loading}
              className="h-11 rounded-md border border-[var(--border)] px-4 text-sm font-medium hover:bg-[var(--muted)] disabled:opacity-60"
            >
              Refresh
            </button>
          </div>

          {error ? (
            <p className="m-4 rounded-md border border-[var(--danger)]/30 bg-red-50 p-3 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="m-4 rounded-md border border-[var(--success)]/30 bg-green-50 p-3 text-sm text-[var(--success)]">
              {message}
            </p>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Last login</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index} className="border-b border-[var(--border)]">
                      <td className="px-4 py-4" colSpan={6}>
                        <div className="h-5 rounded-md bg-[var(--muted)]" />
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-8 text-center text-[var(--muted-foreground)]"
                      colSpan={6}
                    >
                      No users yet.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-[var(--border)]">
                      <td className="px-4 py-3 font-medium">{user.name}</td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 capitalize">{user.role}</td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString()
                          : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-1 text-xs font-medium ${statusClassName(
                            user.isActive,
                          )}`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => editUser(user)}
                          className="h-10 rounded-md border border-[var(--border)] px-3 font-medium hover:bg-[var(--muted)]"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <h2 className="font-semibold">{editing ? "Edit user" : "Add user"}</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Password is required for new users. Leave it blank while editing to keep
            the current password.
          </p>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1 text-sm font-medium">
              Name
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Role
              <select
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target.value as "admin" | "cashier",
                  }))
                }
                className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                <option value="cashier">Cashier</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Password
              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                minLength={editing ? undefined : 8}
                className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                required={!editing}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isActive: event.target.checked }))
                }
              />
              Active account
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              disabled={saving}
              className="h-11 rounded-md bg-[var(--primary)] px-4 font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
            >
              {saving ? "Saving..." : editing ? "Save changes" : "Add user"}
            </button>
            {editing ? (
              <button
                type="button"
                onClick={resetForm}
                className="h-11 rounded-md border border-[var(--border)] px-4 font-medium hover:bg-[var(--muted)]"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
