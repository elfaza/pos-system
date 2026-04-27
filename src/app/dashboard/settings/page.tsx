"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminShell from "@/features/admin/components/admin-shell";
import type { SettingsRecord } from "@/features/catalog/types";

interface SettingsForm {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  logoUrl: string;
  taxEnabled: boolean;
  taxRate: number;
  serviceChargeEnabled: boolean;
  serviceChargeRate: number;
  refundWindowHours: string;
  autoRestoreStockOnRefund: boolean;
  receiptFooter: string;
}

const emptyForm: SettingsForm = {
  storeName: "",
  storeAddress: "",
  storePhone: "",
  logoUrl: "",
  taxEnabled: false,
  taxRate: 0,
  serviceChargeEnabled: false,
  serviceChargeRate: 0,
  refundWindowHours: "",
  autoRestoreStockOnRefund: false,
  receiptFooter: "",
};

function toForm(settings: SettingsRecord): SettingsForm {
  return {
    storeName: settings.storeName,
    storeAddress: settings.storeAddress ?? "",
    storePhone: settings.storePhone ?? "",
    logoUrl: settings.logoUrl ?? "",
    taxEnabled: settings.taxEnabled,
    taxRate: settings.taxRate,
    serviceChargeEnabled: settings.serviceChargeEnabled,
    serviceChargeRate: settings.serviceChargeRate,
    refundWindowHours: settings.refundWindowHours?.toString() ?? "",
    autoRestoreStockOnRefund: settings.autoRestoreStockOnRefund,
    receiptFooter: settings.receiptFooter ?? "",
  };
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load settings.");
      setForm(toForm(data.settings));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSettings();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          refundWindowHours: form.refundWindowHours || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save settings.");
      setForm(toForm(data.settings));
      setSuccess("Settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Settings" eyebrow="Admin configuration">
      <form
        onSubmit={handleSubmit}
        className="max-w-5xl rounded-md border border-[var(--border)] bg-[var(--card)]"
      >
        <div className="border-b border-[var(--border)] p-4">
          <h2 className="font-semibold">Store settings</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Tax and service rates are applied at checkout from these values.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-11 rounded-md bg-[var(--muted)]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 p-4">
            {error ? (
              <p className="rounded-md border border-[var(--danger)]/30 bg-red-50 p-3 text-sm text-[var(--danger)]">
                {error}
              </p>
            ) : null}
            {success ? (
              <p className="rounded-md border border-[var(--success)]/30 bg-green-50 p-3 text-sm text-[var(--success)]">
                {success}
              </p>
            ) : null}

            <section>
              <h3 className="text-sm font-semibold">Store profile</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium">
                  Store name
                  <input
                    value={form.storeName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, storeName: event.target.value }))
                    }
                    className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    required
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Store phone
                  <input
                    value={form.storePhone}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, storePhone: event.target.value }))
                    }
                    className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium md:col-span-2">
                  Store address
                  <input
                    value={form.storeAddress}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        storeAddress: event.target.value,
                      }))
                    }
                    className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium md:col-span-2">
                  Logo URL
                  <input
                    value={form.logoUrl}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, logoUrl: event.target.value }))
                    }
                    className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  />
                </label>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-[var(--border)] p-4">
                <h3 className="text-sm font-semibold">Tax</h3>
                <label className="mt-3 flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.taxEnabled}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, taxEnabled: event.target.checked }))
                    }
                  />
                  Enable tax
                </label>
                <label className="mt-3 grid gap-1 text-sm font-medium">
                  Tax rate percent
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.taxRate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        taxRate: Number(event.target.value),
                      }))
                    }
                    className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  />
                </label>
              </div>

              <div className="rounded-md border border-[var(--border)] p-4">
                <h3 className="text-sm font-semibold">Service charge</h3>
                <label className="mt-3 flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.serviceChargeEnabled}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        serviceChargeEnabled: event.target.checked,
                      }))
                    }
                  />
                  Enable service charge
                </label>
                <label className="mt-3 grid gap-1 text-sm font-medium">
                  Service charge percent
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.serviceChargeRate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        serviceChargeRate: Number(event.target.value),
                      }))
                    }
                    className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  />
                </label>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">
                Refund window hours
                <input
                  type="number"
                  min={0}
                  value={form.refundWindowHours}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      refundWindowHours: event.target.value,
                    }))
                  }
                  className="h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                />
              </label>
              <label className="mt-6 flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.autoRestoreStockOnRefund}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      autoRestoreStockOnRefund: event.target.checked,
                    }))
                  }
                />
                Auto restore stock on refund
              </label>
            </section>

            <label className="grid gap-1 text-sm font-medium">
              Receipt footer
              <textarea
                value={form.receiptFooter}
                onChange={(event) =>
                  setForm((current) => ({ ...current, receiptFooter: event.target.value }))
                }
                className="min-h-24 rounded-md border border-[var(--border)] px-3 py-2 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              />
            </label>
          </div>
        )}

        <div className="flex justify-end border-t border-[var(--border)] p-4">
          <button
            disabled={saving || loading}
            className="h-11 rounded-md bg-[var(--primary)] px-4 font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
