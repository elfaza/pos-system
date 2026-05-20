"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminShell from "@/features/admin/components/admin-shell";
import type { DiningTableRecord } from "@/features/checkout/types";

const emptyForm = { id: "", name: "", sortOrder: 0, isActive: true };
const fieldClass = "h-11 rounded-md border border-[var(--border)] px-3";

export default function TablesPage() {
  const [tables, setTables] = useState<DiningTableRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTables(options?: { skipLoading?: boolean }) {
    if (!options?.skipLoading) setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tables?includeInactive=true");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load tables.");
      setTables(data.tables);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load tables.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    fetch("/api/tables?includeInactive=true")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Unable to load tables.");
        if (!ignore) setTables(data.tables);
      })
      .catch((loadError) => {
        if (!ignore) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load tables.",
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        form.id ? `/api/tables/${form.id}` : "/api/tables",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save table.");
      setForm(emptyForm);
      await loadTables();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save table.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Tables" eyebrow="Admin floor plan">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--card)]">
          <div className="border-b border-[var(--border)] p-4">
            <h2 className="font-semibold">Dining tables</h2>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-[var(--muted-foreground)]">Loading tables...</p>
          ) : tables.length === 0 ? (
            <p className="p-4 text-sm text-[var(--muted-foreground)]">No tables yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-[var(--surface)] text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Sort</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {tables.map((table) => (
                    <tr key={table.id} className="border-t border-[var(--border)]">
                      <td className="px-4 py-3 font-medium">{table.name}</td>
                      <td className="px-4 py-3">{table.sortOrder}</td>
                      <td className="px-4 py-3">{table.isActive ? "Active" : "Hidden"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setForm(table)}
                          className="h-10 rounded-md border border-[var(--border)] px-3 font-medium hover:bg-[var(--surface)]"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-md border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <h2 className="font-semibold">{form.id ? "Edit table" : "New table"}</h2>
          {error ? (
            <p className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}
          <label className="grid gap-1 text-sm font-medium">
            Table name
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className={fieldClass}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Sort order
            <input
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  sortOrder: Number(event.target.value),
                }))
              }
              className={fieldClass}
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
            Active
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="h-11 flex-1 rounded-md bg-[var(--primary)] px-4 font-medium text-[var(--primary-foreground)] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save table"}
            </button>
            {form.id ? (
              <button
                type="button"
                onClick={() => setForm(emptyForm)}
                className="h-11 rounded-md border border-[var(--border)] px-4 font-medium"
              >
                New
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
