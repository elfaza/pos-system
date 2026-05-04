"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/features/admin/components/admin-shell";
import { formatRupiah } from "@/features/checkout/services/checkout-calculations";
import type {
  AccountRecord,
  AccountingReport,
  CashMovementRecord,
  DailyCloseRecord,
  ExpenseCategoryRecord,
  ExpenseRecord,
  JournalEntryRecord,
} from "../types";

type AccountingView = "overview" | "accounts" | "journals" | "expenses" | "cash" | "close";

const viewLinks: { view: AccountingView; href: string; label: string }[] = [
  { view: "overview", href: "/dashboard/accounting", label: "Overview" },
  { view: "accounts", href: "/dashboard/accounting/accounts", label: "Accounts" },
  { view: "journals", href: "/dashboard/accounting/journals", label: "Journals" },
  { view: "expenses", href: "/dashboard/accounting/expenses", label: "Expenses" },
  { view: "cash", href: "/dashboard/accounting/cash", label: "Cash" },
  { view: "close", href: "/dashboard/accounting/close", label: "Daily close" },
];

function todayInput() {
  const today = new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

function parseCurrencyInput(value: string): string {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

function formatCurrencyInput(value: string): string {
  const amount = Number(parseCurrencyInput(value));
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return formatRupiah(amount);
}

function StatCard({
  label: cardLabel,
  value,
  tone = "text-[var(--foreground)]",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
        {cardLabel}
      </p>
      <p className={`mt-2 break-words text-2xl font-semibold tracking-tight ${tone}`}>
        {value}
      </p>
    </div>
  );
}

export default function AccountingDashboard({ initialView }: { initialView: AccountingView }) {
  const [view] = useState(initialView);
  const initialDate = useMemo(() => todayInput(), []);
  const [dateFrom, setDateFrom] = useState(initialDate);
  const [dateTo, setDateTo] = useState(initialDate);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryRecord[]>([]);
  const [journals, setJournals] = useState<JournalEntryRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovementRecord[]>([]);
  const [dailyCloses, setDailyCloses] = useState<DailyCloseRecord[]>([]);
  const [report, setReport] = useState<AccountingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [accountForm, setAccountForm] = useState({
    code: "",
    name: "",
    type: "expense",
    isActive: true,
  });
  const [expenseForm, setExpenseForm] = useState({
    categoryId: "",
    amount: "",
    businessDate: initialDate,
    paymentSource: "cash",
    description: "",
  });
  const [cashForm, setCashForm] = useState({
    type: "cash_in",
    amount: "",
    businessDate: initialDate,
    reason: "",
  });
  const [closeForm, setCloseForm] = useState({
    businessDate: initialDate,
    countedCashAmount: "",
  });

  const loadAccounting = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const reportQuery = new URLSearchParams({ dateFrom, dateTo });
      const responses = await Promise.all([
        fetch("/api/accounting/accounts"),
        fetch("/api/accounting/journal-entries"),
        fetch("/api/accounting/expenses"),
        fetch("/api/accounting/cash-movements"),
        fetch("/api/accounting/daily-closes"),
        fetch(`/api/accounting/reports?${reportQuery.toString()}`),
      ]);
      const data = await Promise.all(responses.map((response) => response.json()));
      const failedIndex = responses.findIndex((response) => !response.ok);
      if (failedIndex >= 0) {
        throw new Error(data[failedIndex].error ?? "Unable to load accounting data.");
      }

      setAccounts(data[0].accounts);
      setExpenseCategories(data[0].expenseCategories);
      setJournals(data[1].journalEntries);
      setExpenses(data[2].expenses);
      setCashMovements(data[3].cashMovements);
      setDailyCloses(data[4].dailyCloses);
      setReport(data[5].report);
      if (!expenseForm.categoryId && data[0].expenseCategories[0]) {
        setExpenseForm((current) => ({
          ...current,
          categoryId: data[0].expenseCategories[0].id,
        }));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load accounting data.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, expenseForm.categoryId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsOnline(window.navigator.onLine);
      void loadAccounting();
    }, 0);
    function handleOnline() {
      setIsOnline(true);
      void loadAccounting();
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadAccounting]);

  async function postJson(url: string, payload: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save accounting record.");
      await loadAccounting();
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save accounting record.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isOnline) return;
    const saved = await postJson("/api/accounting/accounts", accountForm);
    if (saved) {
      setAccountForm({ code: "", name: "", type: "expense", isActive: true });
      setMessage("Account created.");
    }
  }

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isOnline) return;
    const saved = await postJson("/api/accounting/expenses", expenseForm);
    if (saved) {
      setExpenseForm((current) => ({ ...current, amount: "", description: "" }));
      setMessage("Expense recorded.");
    }
  }

  async function submitCashMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isOnline) return;
    const saved = await postJson("/api/accounting/cash-movements", cashForm);
    if (saved) {
      setCashForm((current) => ({ ...current, amount: "", reason: "" }));
      setMessage("Cash movement recorded.");
    }
  }

  async function submitDailyClose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isOnline) return;
    setShowCloseDialog(true);
  }

  async function confirmDailyClose() {
    if (!isOnline) return;
    setShowCloseDialog(false);
    const saved = await postJson("/api/accounting/daily-closes", closeForm);
    if (saved) {
      setCloseForm((current) => ({ ...current, countedCashAmount: "" }));
      setMessage("Daily close recorded.");
    }
  }

  const title = view === "overview" ? "Accounting" : viewLinks.find((item) => item.view === view)?.label ?? "Accounting";

  return (
    <AdminShell title={title} eyebrow="Admin accounting">
      <div className="grid gap-5">
        {showCloseDialog ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="daily-close-dialog-title"
              className="w-full max-w-md rounded-md border border-[var(--border)] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.28)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 id="daily-close-dialog-title" className="text-lg font-semibold">
                    Close business date?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    Daily closes cannot be duplicated. This will record counted cash for{" "}
                    <span className="font-medium text-[var(--foreground)]">
                      {closeForm.businessDate}
                    </span>
                    .
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCloseDialog(false)}
                  className="h-9 w-9 rounded-md border border-[var(--border)] text-lg leading-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  aria-label="Close dialog"
                >
                  x
                </button>
              </div>
              <div className="mt-4 rounded-md border border-[var(--warning)]/30 bg-orange-50 p-3 text-sm text-[var(--warning)]">
                Counted cash: {formatCurrencyInput(closeForm.countedCashAmount) || "Rp 0"}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setShowCloseDialog(false)}
                  className="h-11 rounded-md border border-[var(--border)] bg-white px-4 font-medium hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmDailyClose()}
                  disabled={saving || !isOnline}
                  className="h-11 rounded-md bg-[var(--primary)] px-4 font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Closing..." : "Close day"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <nav className="flex gap-2 overflow-x-auto rounded-md border border-[var(--border)] bg-white p-2">
          {viewLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
                item.view === view
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted-foreground)] hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {!isOnline ? (
          <div className="rounded-md border border-[var(--warning)]/30 bg-orange-50 p-3 text-sm text-[var(--warning)]">
            Connection lost. Accounting mutations are disabled until the POS reconnects.
          </div>
        ) : null}
        {message ? (
          <div className="rounded-md border border-[var(--success)]/30 bg-green-50 p-3 text-sm text-[var(--success)]">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-md border border-[var(--danger)]/30 bg-red-50 p-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        ) : null}

        <section className="rounded-md border border-[var(--border)] bg-white p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="grid gap-1 text-sm font-medium">
              From
              <input className="h-11 rounded-md border border-[var(--border)] px-3" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              To
              <input className="h-11 rounded-md border border-[var(--border)] px-3" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
            <button type="button" onClick={() => void loadAccounting()} disabled={loading} className="h-11 rounded-md bg-[var(--primary)] px-4 font-medium text-white disabled:opacity-60">
              {loading ? "Loading..." : "Apply"}
            </button>
          </div>
        </section>

        {loading ? (
          <div className="grid gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-md border border-[var(--border)] bg-white" />
            ))}
          </div>
        ) : (
          <>
            <section className="grid gap-3 md:grid-cols-4">
              <StatCard label="Cash balance" value={formatRupiah(report?.cashBalance ?? 0)} tone="text-[var(--primary)]" />
              <StatCard label="Income" value={formatRupiah(report?.incomeAmount ?? 0)} tone="text-[var(--success)]" />
              <StatCard label="Expenses" value={formatRupiah(report?.expenseAmount ?? 0)} tone="text-[var(--danger)]" />
              <StatCard label="Cash movements" value={cashMovements.length.toString()} />
            </section>

            {(view === "overview" || view === "accounts") && (
              <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
                <form onSubmit={submitAccount} className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-4">
                  <h2 className="font-semibold">Create Account</h2>
                  <input className="h-11 rounded-md border border-[var(--border)] px-3" placeholder="Code" value={accountForm.code} onChange={(event) => setAccountForm({ ...accountForm, code: event.target.value })} />
                  <input className="h-11 rounded-md border border-[var(--border)] px-3" placeholder="Name" value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} />
                  <select className="h-11 rounded-md border border-[var(--border)] px-3" value={accountForm.type} onChange={(event) => setAccountForm({ ...accountForm, type: event.target.value })}>
                    {["asset", "income", "expense", "liability", "equity"].map((type) => <option key={type} value={type}>{label(type)}</option>)}
                  </select>
                  <button disabled={!isOnline || saving} className="h-11 rounded-md bg-[var(--primary)] px-4 font-medium text-white disabled:opacity-60">Save account</button>
                </form>
                <div className="overflow-x-auto rounded-md border border-[var(--border)] bg-white">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                      <tr><th className="p-3">Code</th><th className="p-3">Name</th><th className="p-3">Type</th><th className="p-3">Status</th></tr>
                    </thead>
                    <tbody>{accounts.map((account) => <tr key={account.id} className="border-t border-[var(--border)]"><td className="p-3 font-medium">{account.code}</td><td className="p-3">{account.name}</td><td className="p-3">{label(account.type)}</td><td className="p-3">{account.isActive ? "Active" : "Inactive"}</td></tr>)}</tbody>
                  </table>
                  {accounts.length === 0 ? <p className="p-4 text-sm text-[var(--muted-foreground)]">No accounts are configured.</p> : null}
                </div>
              </section>
            )}

            {(view === "overview" || view === "expenses") && (
              <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
                <form onSubmit={submitExpense} className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-4">
                  <h2 className="font-semibold">Record Expense</h2>
                  <input className="h-11 rounded-md border border-[var(--border)] px-3" type="date" value={expenseForm.businessDate} onChange={(event) => setExpenseForm({ ...expenseForm, businessDate: event.target.value })} />
                  <select className="h-11 rounded-md border border-[var(--border)] px-3" value={expenseForm.categoryId} onChange={(event) => setExpenseForm({ ...expenseForm, categoryId: event.target.value })}>
                    {expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                  <input className="h-11 rounded-md border border-[var(--border)] px-3" inputMode="numeric" placeholder="Rp 0" value={formatCurrencyInput(expenseForm.amount)} onChange={(event) => setExpenseForm({ ...expenseForm, amount: parseCurrencyInput(event.target.value) })} />
                  <select className="h-11 rounded-md border border-[var(--border)] px-3" value={expenseForm.paymentSource} onChange={(event) => setExpenseForm({ ...expenseForm, paymentSource: event.target.value })}>
                    <option value="cash">Cash</option><option value="qris">QRIS</option>
                  </select>
                  <textarea className="min-h-24 rounded-md border border-[var(--border)] p-3" placeholder="Description" value={expenseForm.description} onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })} />
                  <button disabled={!isOnline || saving || !expenseForm.categoryId} className="h-11 rounded-md bg-[var(--primary)] px-4 font-medium text-white disabled:opacity-60">Record expense</button>
                </form>
                <TablePanel title="Expenses" empty="No expenses recorded." itemCount={expenses.length}>
                  <tbody>{expenses.map((expense) => <tr key={expense.id} className="border-t border-[var(--border)]"><td className="p-3">{expense.businessDate}</td><td className="p-3">{expense.categoryName}</td><td className="p-3">{expense.description}</td><td className="p-3">{label(expense.paymentSource)}</td><td className="p-3 text-right">{formatRupiah(expense.amount)}</td></tr>)}</tbody>
                </TablePanel>
              </section>
            )}

            {(view === "overview" || view === "cash") && (
              <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
                <form onSubmit={submitCashMovement} className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-4">
                  <h2 className="font-semibold">Record Cash In/Out</h2>
                  <input className="h-11 rounded-md border border-[var(--border)] px-3" type="date" value={cashForm.businessDate} onChange={(event) => setCashForm({ ...cashForm, businessDate: event.target.value })} />
                  <select className="h-11 rounded-md border border-[var(--border)] px-3" value={cashForm.type} onChange={(event) => setCashForm({ ...cashForm, type: event.target.value })}>
                    <option value="cash_in">Cash in</option><option value="cash_out">Cash out</option>
                  </select>
                  <input className="h-11 rounded-md border border-[var(--border)] px-3" inputMode="numeric" placeholder="Rp 0" value={formatCurrencyInput(cashForm.amount)} onChange={(event) => setCashForm({ ...cashForm, amount: parseCurrencyInput(event.target.value) })} />
                  <textarea className="min-h-24 rounded-md border border-[var(--border)] p-3" placeholder="Reason" value={cashForm.reason} onChange={(event) => setCashForm({ ...cashForm, reason: event.target.value })} />
                  <button disabled={!isOnline || saving} className="h-11 rounded-md bg-[var(--primary)] px-4 font-medium text-white disabled:opacity-60">Record movement</button>
                </form>
                <TablePanel title="Cash Ledger" empty="No cash ledger rows for this period." itemCount={report?.cashLedger.length ?? 0}>
                  <tbody>{report?.cashLedger.map((entry) => <tr key={entry.id} className="border-t border-[var(--border)]"><td className="p-3">{entry.businessDate}</td><td className="p-3">{label(entry.direction)}</td><td className="p-3">{entry.description}</td><td className="p-3">{label(entry.sourceType)}</td><td className="p-3 text-right">{formatRupiah(entry.amount)}</td></tr>)}</tbody>
                </TablePanel>
              </section>
            )}

            {(view === "journals") && (
              <div className="grid gap-3">
                {journals.length === 0 ? <p className="rounded-md border border-dashed border-[var(--border)] bg-white p-6 text-sm text-[var(--muted-foreground)]">No journal entries recorded.</p> : null}
                {journals.map((entry) => (
                  <div key={entry.id} className="rounded-md border border-[var(--border)] bg-white">
                    <div className="border-b border-[var(--border)] p-4"><h2 className="font-semibold">{entry.entryNumber}</h2><p className="text-sm text-[var(--muted-foreground)]">{entry.businessDate} · {entry.description}</p></div>
                    <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><tbody>{entry.lines.map((line) => <tr key={line.id} className="border-t border-[var(--border)]"><td className="p-3">{line.accountCode}</td><td className="p-3">{line.accountName}</td><td className="p-3 text-right">{formatRupiah(line.debitAmount)}</td><td className="p-3 text-right">{formatRupiah(line.creditAmount)}</td></tr>)}</tbody></table></div>
                  </div>
                ))}
              </div>
            )}

            {(view === "overview" || view === "close") && (
              <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
                <form onSubmit={submitDailyClose} className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-4">
                  <h2 className="font-semibold">Daily Close</h2>
                  <input className="h-11 rounded-md border border-[var(--border)] px-3" type="date" value={closeForm.businessDate} onChange={(event) => setCloseForm({ ...closeForm, businessDate: event.target.value })} />
                  <input className="h-11 rounded-md border border-[var(--border)] px-3" inputMode="numeric" placeholder="Rp 0" value={formatCurrencyInput(closeForm.countedCashAmount)} onChange={(event) => setCloseForm({ ...closeForm, countedCashAmount: parseCurrencyInput(event.target.value) })} />
                  <button disabled={!isOnline || saving} className="h-11 rounded-md bg-[var(--primary)] px-4 font-medium text-white disabled:opacity-60">Close day</button>
                </form>
                <div className="overflow-x-auto rounded-md border border-[var(--border)] bg-white">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-foreground)]"><tr><th className="p-3">Date</th><th className="p-3 text-right">Expected</th><th className="p-3 text-right">Counted</th><th className="p-3 text-right">Difference</th><th className="p-3">Closed</th></tr></thead>
                    <tbody>{dailyCloses.map((close) => <tr key={close.id} className="border-t border-[var(--border)]"><td className="p-3">{close.businessDate}</td><td className="p-3 text-right">{formatRupiah(close.expectedCashAmount)}</td><td className="p-3 text-right">{formatRupiah(close.countedCashAmount)}</td><td className={`p-3 text-right font-semibold ${close.differenceAmount === 0 ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>{close.differenceAmount === 0 ? "Exact: " : close.differenceAmount > 0 ? "Over: " : "Short: "}{formatRupiah(Math.abs(close.differenceAmount))}</td><td className="p-3">{formatDateTime(close.closedAt)}</td></tr>)}</tbody>
                  </table>
                  {dailyCloses.length === 0 ? <p className="p-4 text-sm text-[var(--muted-foreground)]">No daily closes recorded.</p> : null}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}

function TablePanel({
  title,
  empty,
  itemCount,
  children,
}: {
  title: string;
  empty: string;
  itemCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-[var(--border)] bg-white">
      <div className="border-b border-[var(--border)] p-4">
        <h2 className="font-semibold">{title}</h2>
      </div>
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
          <tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Description</th><th className="p-3">Source</th><th className="p-3 text-right">Amount</th></tr>
        </thead>
        {children}
      </table>
      {itemCount === 0 ? <p className="p-4 text-sm text-[var(--muted-foreground)]">{empty}</p> : null}
    </div>
  );
}
