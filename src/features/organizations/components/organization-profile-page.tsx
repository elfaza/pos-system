"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminShell from "@/features/admin/components/admin-shell";

interface OrganizationProfile {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export default function OrganizationProfilePage() {
  const [organization, setOrganization] = useState<OrganizationProfile | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/organizations/current");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load organization.");
      setOrganization(result.organization);
      setCanEdit(result.canEdit === true);
      setForm({ name: result.organization.name, slug: result.organization.slug });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load organization.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/organizations/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save organization.");
      setOrganization(result.organization);
      setMessage("Organization profile saved.");
      window.location.reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save organization.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Organization" eyebrow="Workspace administration">
      <div className="mx-auto max-w-3xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Organization profile</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">This profile is shared by all outlets in your organization.</p>
        {error ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-[var(--danger)]">{error}</p> : null}
        {message ? <p role="status" className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-[var(--success)]">{message}</p> : null}
        {loading ? <p className="mt-6 text-sm text-[var(--muted-foreground)]">Loading organization…</p> : organization ? (
          <form onSubmit={save} className="mt-6 grid gap-5">
            <label className="grid gap-1.5 text-sm font-medium">Organization name
              <input value={form.name} disabled={!canEdit} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-11 rounded-lg border border-[var(--border)] bg-white px-3 disabled:bg-[var(--muted)]" required />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">Organization slug
              <input value={form.slug} disabled={!canEdit} onChange={(event) => setForm({ ...form, slug: event.target.value })} className="h-11 rounded-lg border border-[var(--border)] bg-white px-3 disabled:bg-[var(--muted)]" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
              <span className="font-normal text-xs text-[var(--muted-foreground)]">Lowercase letters and numbers separated by single hyphens.</span>
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${organization.isActive ? "bg-green-50 text-[var(--success)]" : "bg-slate-100 text-slate-600"}`}>{organization.isActive ? "Active" : "Inactive"}</span>
              {canEdit ? <button type="submit" disabled={saving} className="h-11 rounded-lg bg-[var(--primary)] px-5 font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save profile"}</button> : <p className="text-sm text-[var(--muted-foreground)]">Only an organization owner can edit this profile.</p>}
            </div>
          </form>
        ) : null}
      </div>
    </AdminShell>
  );
}
