"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AdminShell from "@/features/admin/components/admin-shell";
import type { CategoryRecord } from "@/features/catalog/types";

const emptyForm = {
  id: "",
  name: "",
  slug: "",
  sortOrder: 0,
  isActive: true,
};

type CategoryForm = typeof emptyForm;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCategories() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/categories?includeInactive=true");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load categories.");
      setCategories(data.categories);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load categories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadCategories();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const editing = useMemo(() => Boolean(form.id), [form.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        editing ? `/api/categories/${form.id}` : "/api/categories",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save category.");
      setForm(emptyForm);
      await loadCategories();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save category.");
    } finally {
      setSaving(false);
    }
  }

  function editCategory(category: CategoryRecord) {
    setForm({
      id: category.id,
      name: category.name,
      slug: category.slug,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
  }

  return (
    <AdminShell title="Categories" eyebrow="Admin catalog">
      <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--card)]">
          <div className="grid gap-3 border-b border-[var(--border)] p-4 lg:grid-cols-[1fr_220px_auto]">
            <div>
              <h2 className="font-semibold">Category list</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Inactive categories are hidden from cashier POS.
              </p>
            </div>
            <button
              onClick={() => void loadCategories()}
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

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Sort</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <tr key={index} className="border-b border-[var(--border)]">
                      <td className="px-4 py-4" colSpan={6}>
                        <div className="h-5 rounded-md bg-[var(--muted)]" />
                      </td>
                    </tr>
                  ))
                ) : categories.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-[var(--muted-foreground)]" colSpan={6}>
                      No categories yet.
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id} className="border-b border-[var(--border)]">
                      <td className="px-4 py-3 font-medium">{category.name}</td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{category.slug}</td>
                      <td className="px-4 py-3">{category.sortOrder}</td>
                      <td className="px-4 py-3">{category.productCount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-1 text-xs font-medium ${
                            category.isActive
                              ? "bg-green-50 text-[var(--success)]"
                              : "bg-slate-100 text-[var(--muted-foreground)]"
                          }`}
                        >
                          {category.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => editCategory(category)}
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
          <h2 className="font-semibold">{editing ? "Edit category" : "Add category"}</h2>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1 text-sm font-medium">
              Name
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                    slug: current.slug || slugify(event.target.value),
                  }))
                }
                className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Slug
              <input
                value={form.slug}
                onChange={(event) =>
                  setForm((current) => ({ ...current, slug: slugify(event.target.value) }))
                }
                className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Sort order
              <input
                type="number"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sortOrder: Number(event.target.value),
                  }))
                }
                className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
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
              Active in POS
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              disabled={saving}
              className="h-11 rounded-md bg-[var(--primary)] px-4 font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
            >
              {saving ? "Saving..." : editing ? "Save changes" : "Add category"}
            </button>
            {editing ? (
              <button
                type="button"
                onClick={() => setForm(emptyForm)}
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
