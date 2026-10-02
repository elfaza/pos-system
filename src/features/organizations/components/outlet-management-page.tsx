"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminShell from "@/features/admin/components/admin-shell";

interface OutletRow { id: string; name: string; slug: string; timeZone: string; isActive: boolean; }
const blank = { name: "", slug: "", timeZone: "Asia/Jakarta" };

export default function OutletManagementPage() {
  const [outlets, setOutlets] = useState<OutletRow[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [canManageOutletStructure, setCanManageOutletStructure] = useState(false);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/outlets");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load outlets.");
      setOutlets(result.outlets);
      setCanCreate(result.canCreate === true);
      setCanManageOutletStructure(result.canManageOutletStructure === true);
      if (result.canCreate !== true && result.outlets[0]) {
        setEditingId(result.outlets[0].id);
        setForm({ name: result.outlets[0].name, slug: result.outlets[0].slug, timeZone: result.outlets[0].timeZone });
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load outlets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  function edit(outlet: OutletRow) {
    setEditingId(outlet.id);
    setForm({ name: outlet.name, slug: outlet.slug, timeZone: outlet.timeZone });
    setMessage(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(editingId ? `/api/outlets/${editingId}` : "/api/outlets", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(canManageOutletStructure ? form : { name: form.name, timeZone: form.timeZone }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save outlet.");
      setForm(blank);
      setEditingId(null);
      setMessage(editingId ? "Outlet updated." : "Outlet created.");
      window.location.reload();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save outlet.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(outlet: OutletRow) {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/outlets/${outlet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !outlet.isActive }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update outlet status.");
      setMessage(outlet.isActive ? "Outlet deactivated." : "Outlet activated.");
      window.location.reload();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update outlet status.");
    }
  }

  return (
    <AdminShell title="Outlets" eyebrow="Workspace administration">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="border-b border-[var(--border)] p-5">
            <h2 className="font-semibold">Your outlets</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Each outlet has its own settings, inventory, orders, and reports.</p>
          </div>
          {error ? <p role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-[var(--danger)]">{error}</p> : null}
          {message ? <p role="status" className="m-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-[var(--success)]">{message}</p> : null}
          {loading ? <p className="p-5 text-sm text-[var(--muted-foreground)]">Loading outlets…</p> : outlets.length === 0 ? <p className="p-5 text-sm text-[var(--muted-foreground)]">No outlets found.</p> : (
            <ul className="divide-y divide-[var(--border)]">
              {outlets.map((outlet) => (
                <li key={outlet.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{outlet.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{outlet.slug} · {outlet.timeZone}</p>
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${outlet.isActive ? "bg-green-50 text-[var(--success)]" : "bg-slate-100 text-slate-600"}`}>{outlet.isActive ? "Active" : "Inactive"}</span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => edit(outlet)} className="h-10 rounded-lg border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--muted)]">Edit</button>
                    {canManageOutletStructure ? <button type="button" onClick={() => void toggleActive(outlet)} className="h-10 rounded-lg border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--muted)]">{outlet.isActive ? "Deactivate" : "Activate"}</button> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form onSubmit={save} className="h-fit rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="font-semibold">{editingId ? "Edit outlet" : "Add outlet"}</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{canCreate ? "Use a unique slug within this organization." : "Outlet administrators can edit the current outlet details."}</p>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">Outlet name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-11 rounded-lg border border-[var(--border)] px-3" required /></label>
            {canManageOutletStructure ? <label className="grid gap-1.5 text-sm font-medium">Slug<input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} className="h-11 rounded-lg border border-[var(--border)] px-3" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label> : null}
            <label className="grid gap-1.5 text-sm font-medium">Time zone<input value={form.timeZone} onChange={(event) => setForm({ ...form, timeZone: event.target.value })} className="h-11 rounded-lg border border-[var(--border)] px-3" required /></label>
            <button type="submit" disabled={saving || (!canCreate && !editingId)} className="h-11 rounded-lg bg-[var(--primary)] px-4 font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : editingId ? "Save outlet" : "Create outlet"}</button>
            {editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(blank); }} className="h-10 text-sm font-medium text-[var(--muted-foreground)] underline">Cancel edit</button> : null}
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
