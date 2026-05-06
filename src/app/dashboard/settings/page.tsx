"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import AdminShell from "@/features/admin/components/admin-shell";
import type { SettingsRecord } from "@/features/catalog/types";

interface SettingsForm {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  logoUrl: string;
  locale: string;
  currencyCode: string;
  timeZone: string;
  businessDayStartTime: string;
  taxEnabled: boolean;
  taxRate: number;
  serviceChargeEnabled: boolean;
  serviceChargeRate: number;
  cashPaymentEnabled: boolean;
  qrisPaymentEnabled: boolean;
  kitchenEnabled: boolean;
  queueEnabled: boolean;
  inventoryEnabled: boolean;
  accountingEnabled: boolean;
  reportingEnabled: boolean;
  receiptPrintingEnabled: boolean;
  refundWindowHours: string;
  autoRestoreStockOnRefund: boolean;
  receiptFooter: string;
}

type ConfigurableSettingsRecord = SettingsRecord & {
  locale?: string;
  currencyCode?: string;
  timeZone?: string;
  businessDayStartTime?: string;
  cashPaymentEnabled?: boolean;
  qrisPaymentEnabled?: boolean;
  kitchenEnabled?: boolean;
  queueEnabled?: boolean;
  inventoryEnabled?: boolean;
  accountingEnabled?: boolean;
  reportingEnabled?: boolean;
  receiptPrintingEnabled?: boolean;
};

const emptyForm: SettingsForm = {
  storeName: "",
  storeAddress: "",
  storePhone: "",
  logoUrl: "",
  locale: "id-ID",
  currencyCode: "IDR",
  timeZone: "Asia/Jakarta",
  businessDayStartTime: "00:00",
  taxEnabled: false,
  taxRate: 0,
  serviceChargeEnabled: false,
  serviceChargeRate: 0,
  cashPaymentEnabled: true,
  qrisPaymentEnabled: false,
  kitchenEnabled: true,
  queueEnabled: true,
  inventoryEnabled: true,
  accountingEnabled: true,
  reportingEnabled: true,
  receiptPrintingEnabled: true,
  refundWindowHours: "",
  autoRestoreStockOnRefund: false,
  receiptFooter: "",
};

const fieldClass =
  "h-11 rounded-md border border-[var(--border)] px-3 focus-visible:ring-2 focus-visible:ring-[var(--primary)]";
const checkboxClass = "size-4 rounded border-[var(--border)]";

function toForm(settings: ConfigurableSettingsRecord): SettingsForm {
  return {
    storeName: settings.storeName,
    storeAddress: settings.storeAddress ?? "",
    storePhone: settings.storePhone ?? "",
    logoUrl: settings.logoUrl ?? "",
    locale: settings.locale ?? emptyForm.locale,
    currencyCode: settings.currencyCode ?? emptyForm.currencyCode,
    timeZone: settings.timeZone ?? emptyForm.timeZone,
    businessDayStartTime: settings.businessDayStartTime ?? emptyForm.businessDayStartTime,
    taxEnabled: settings.taxEnabled,
    taxRate: settings.taxRate,
    serviceChargeEnabled: settings.serviceChargeEnabled,
    serviceChargeRate: settings.serviceChargeRate,
    cashPaymentEnabled: settings.cashPaymentEnabled ?? emptyForm.cashPaymentEnabled,
    qrisPaymentEnabled: settings.qrisPaymentEnabled ?? emptyForm.qrisPaymentEnabled,
    kitchenEnabled: settings.kitchenEnabled ?? emptyForm.kitchenEnabled,
    queueEnabled: settings.queueEnabled ?? emptyForm.queueEnabled,
    inventoryEnabled: settings.inventoryEnabled ?? emptyForm.inventoryEnabled,
    accountingEnabled: settings.accountingEnabled ?? emptyForm.accountingEnabled,
    reportingEnabled: settings.reportingEnabled ?? emptyForm.reportingEnabled,
    receiptPrintingEnabled:
      settings.receiptPrintingEnabled ?? emptyForm.receiptPrintingEnabled,
    refundWindowHours: settings.refundWindowHours?.toString() ?? "",
    autoRestoreStockOnRefund: settings.autoRestoreStockOnRefund,
    receiptFooter: settings.receiptFooter ?? "",
  };
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[var(--border)] pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 grid gap-4">{children}</div>
    </section>
  );
}

function ToggleField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm font-medium">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={checkboxClass}
      />
      {label}
    </label>
  );
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

    if (!form.cashPaymentEnabled && !form.qrisPaymentEnabled) {
      setError("Enable at least one payment method.");
      setSuccess(null);
      return;
    }

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
            Store, payment, and module settings are enforced by the backend.
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

            <Section title="Store profile">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium">
                  Store name
                  <input
                    value={form.storeName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, storeName: event.target.value }))
                    }
                    className={fieldClass}
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
                    className={fieldClass}
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
                    className={fieldClass}
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium md:col-span-2">
                  Logo URL
                  <input
                    value={form.logoUrl}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, logoUrl: event.target.value }))
                    }
                    className={fieldClass}
                  />
                </label>
              </div>
            </Section>

            <Section title="Locale and business day">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium">
                  Locale
                  <input
                    value={form.locale}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, locale: event.target.value }))
                    }
                    className={fieldClass}
                    placeholder="id-ID"
                    required
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Currency code
                  <input
                    value={form.currencyCode}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        currencyCode: event.target.value.toUpperCase(),
                      }))
                    }
                    className={fieldClass}
                    maxLength={3}
                    placeholder="IDR"
                    required
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Time zone
                  <input
                    value={form.timeZone}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, timeZone: event.target.value }))
                    }
                    className={fieldClass}
                    placeholder="Asia/Jakarta"
                    required
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Business day starts
                  <input
                    type="time"
                    value={form.businessDayStartTime}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        businessDayStartTime: event.target.value,
                      }))
                    }
                    className={fieldClass}
                    required
                  />
                </label>
              </div>
            </Section>

            <Section title="Charges">
              <div className="grid gap-4 md:grid-cols-2">
                <ToggleField
                  checked={form.taxEnabled}
                  label="Enable tax"
                  onChange={(taxEnabled) =>
                    setForm((current) => ({ ...current, taxEnabled }))
                  }
                />
                <label className="grid gap-1 text-sm font-medium">
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
                    className={fieldClass}
                  />
                </label>
                <ToggleField
                  checked={form.serviceChargeEnabled}
                  label="Enable service charge"
                  onChange={(serviceChargeEnabled) =>
                    setForm((current) => ({ ...current, serviceChargeEnabled }))
                  }
                />
                <label className="grid gap-1 text-sm font-medium">
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
                    className={fieldClass}
                  />
                </label>
              </div>
            </Section>

            <Section title="Payment methods">
              <div className="grid gap-4 md:grid-cols-2">
                <ToggleField
                  checked={form.cashPaymentEnabled}
                  label="Cash payment"
                  onChange={(cashPaymentEnabled) =>
                    setForm((current) => ({ ...current, cashPaymentEnabled }))
                  }
                />
                <ToggleField
                  checked={form.qrisPaymentEnabled}
                  label="QRIS payment"
                  onChange={(qrisPaymentEnabled) =>
                    setForm((current) => ({ ...current, qrisPaymentEnabled }))
                  }
                />
              </div>
            </Section>

            <Section title="Module availability">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <ToggleField
                  checked={form.kitchenEnabled}
                  label="Kitchen"
                  onChange={(kitchenEnabled) =>
                    setForm((current) => ({ ...current, kitchenEnabled }))
                  }
                />
                <ToggleField
                  checked={form.queueEnabled}
                  label="Queue display"
                  onChange={(queueEnabled) =>
                    setForm((current) => ({ ...current, queueEnabled }))
                  }
                />
                <ToggleField
                  checked={form.inventoryEnabled}
                  label="Inventory"
                  onChange={(inventoryEnabled) =>
                    setForm((current) => ({ ...current, inventoryEnabled }))
                  }
                />
                <ToggleField
                  checked={form.accountingEnabled}
                  label="Accounting"
                  onChange={(accountingEnabled) =>
                    setForm((current) => ({ ...current, accountingEnabled }))
                  }
                />
                <ToggleField
                  checked={form.reportingEnabled}
                  label="Reporting"
                  onChange={(reportingEnabled) =>
                    setForm((current) => ({ ...current, reportingEnabled }))
                  }
                />
              </div>
            </Section>

            <Section title="Refund and receipt">
              <div className="grid gap-4 md:grid-cols-2">
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
                    className={fieldClass}
                  />
                </label>
                <ToggleField
                  checked={form.autoRestoreStockOnRefund}
                  label="Auto restore stock on refund"
                  onChange={(autoRestoreStockOnRefund) =>
                    setForm((current) => ({ ...current, autoRestoreStockOnRefund }))
                  }
                />
                <ToggleField
                  checked={form.receiptPrintingEnabled}
                  label="Receipt printing"
                  onChange={(receiptPrintingEnabled) =>
                    setForm((current) => ({ ...current, receiptPrintingEnabled }))
                  }
                />
                <label className="grid gap-1 text-sm font-medium md:col-span-2">
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
            </Section>
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
