import { Prisma } from "@prisma/client";
import { NotFoundError, ValidationError } from "@/lib/api-response";
import { toBoolean, toDecimalString } from "@/lib/number";
import { prisma } from "@/lib/prisma";
import type { User } from "@/features/auth/types";
import type { TenantContext } from "@/features/auth/types";
import { requireTenantContext } from "@/features/auth/services/session-service";
import { withTenantTransaction } from "@/lib/tenant-prisma";
import { requireModuleEnabled } from "@/features/catalog/services/module-config";
import { getQueueBusinessDate } from "@/features/kitchen/services/queue-number";
import {
  mapAccount,
  mapCashLedgerEntry,
  mapCashMovement,
  mapDailyClose,
  mapExpense,
  mapExpenseCategory,
  mapJournalEntry,
} from "./accounting-mappers";
import type { AccountingReport } from "../types";

type TransactionClient = Prisma.TransactionClient;

const defaultAccounts = [
  { code: "1000", name: "Cash on Hand", type: "asset" },
  { code: "1100", name: "QRIS Clearing", type: "asset" },
  { code: "3000", name: "Owner Equity and Cash Variance", type: "equity" },
  { code: "4000", name: "Sales Revenue", type: "income" },
  { code: "4010", name: "Service Charge Revenue", type: "income" },
  { code: "2100", name: "Tax Payable", type: "liability" },
  { code: "5000", name: "Operating Expense", type: "expense" },
] as const;

const defaultExpenseCategories = [
  { name: "Supplies", accountCode: "5000" },
  { name: "Utilities", accountCode: "5000" },
  { name: "Maintenance", accountCode: "5000" },
] as const;

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseBusinessDate(value: unknown, field = "businessDate"): string {
  const date = optionalString(value);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ValidationError("Business date is invalid.", {
      [field]: "Use YYYY-MM-DD format.",
    });
  }

  const [year, month, day] = date.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new ValidationError("Business date is invalid.", {
      [field]: "Use a valid calendar date.",
    });
  }

  return date;
}

function parsePositiveMoney(value: unknown, field = "amount"): string {
  const amount = toDecimalString(value, "");
  if (amount === "" || Number(amount) <= 0) {
    throw new ValidationError("Amount validation failed.", {
      [field]: "Amount must be greater than 0.",
    });
  }
  return roundMoney(Number(amount)).toString();
}

function makeEntryNumber(prefix: string, date = new Date()) {
  const stamp = date
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 17);
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${stamp}-${suffix}`;
}

async function ensureDefaultAccountingSetup(tenant: TenantContext, tx: TransactionClient = prisma) {
  const accountByCode = new Map<string, { id: string }>();

  for (const account of defaultAccounts) {
    const code = account.code;
    const created = await tx.account.upsert({
      where: { organizationId_code: { organizationId: tenant.organizationId, code } },
      update: {
        name: account.name,
        type: account.type,
        isActive: true,
      },
      create: { ...account, organizationId: tenant.organizationId, code },
      select: { id: true, code: true },
    });
    accountByCode.set(account.code, created);
  }

  for (const category of defaultExpenseCategories) {
    const account = accountByCode.get(category.accountCode);
    if (!account) continue;

    await tx.expenseCategory.upsert({
      where: { organizationId_name: { organizationId: tenant.organizationId, name: category.name } },
      update: { accountId: account.id, isActive: true },
      create: {
        organizationId: tenant.organizationId,
        name: category.name,
        accountId: account.id,
      },
    });
  }

  return accountByCode;
}

function validateBalancedLines(
  lines: { debitAmount?: number; creditAmount?: number }[],
) {
  const debit = roundMoney(
    lines.reduce((sum, line) => sum + (line.debitAmount ?? 0), 0),
  );
  const credit = roundMoney(
    lines.reduce((sum, line) => sum + (line.creditAmount ?? 0), 0),
  );

  if (debit <= 0 || debit !== credit) {
    throw new ValidationError("Journal entry must balance.");
  }
}

async function createJournalEntry(
  tx: TransactionClient,
  tenant: TenantContext,
  input: {
    sourceType: "order" | "expense" | "cash_movement" | "daily_close";
    sourceId: string;
    businessDate: string;
    description: string;
    createdByUserId: string | null;
    lines: { accountId: string; debitAmount?: number; creditAmount?: number }[];
  },
) {
  validateBalancedLines(input.lines);

  return tx.journalEntry.upsert({
    where: {
      outletId_sourceType_sourceId: {
        outletId: tenant.outletId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
    },
    update: {},
    create: {
      entryNumber: makeEntryNumber("JE"),
      organizationId: tenant.organizationId,
      outletId: tenant.outletId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      businessDate: input.businessDate,
      description: input.description,
      createdByUserId: input.createdByUserId,
      lines: {
        create: input.lines.map((line) => ({
          accountId: line.accountId,
          debitAmount: new Prisma.Decimal(line.debitAmount ?? 0),
          creditAmount: new Prisma.Decimal(line.creditAmount ?? 0),
        })),
      },
    },
  });
}

export async function createSalesAccountingForPaidOrder(
  tx: TransactionClient,
  input: {
    orderId: string;
    organizationId: string;
    outletId: string;
    orderNumber: string;
    paymentId: string;
    paymentMethod: "cash" | "qris";
    businessDate: string;
    actorId: string;
    subtotalAmount: number;
    discountAmount: number;
    taxAmount: number;
    serviceChargeAmount: number;
    totalAmount: number;
  },
) {
  const tenant = { userId: input.actorId, organizationId: input.organizationId, outletId: input.outletId, role: "admin" as const };
  const accounts = await ensureDefaultAccountingSetup(tenant, tx);
  const paymentAccount = accounts.get(input.paymentMethod === "cash" ? "1000" : "1100");
  const sales = accounts.get("4000");
  const serviceCharge = accounts.get("4010");
  const tax = accounts.get("2100");

  if (!paymentAccount || !sales || !serviceCharge || !tax) {
    throw new ValidationError("Accounting accounts are not configured.");
  }

  const netSales = roundMoney(input.subtotalAmount - input.discountAmount);
  const lines: { accountId: string; debitAmount?: number; creditAmount?: number }[] = [
    { accountId: paymentAccount.id, debitAmount: input.totalAmount },
    { accountId: sales.id, creditAmount: netSales },
  ];
  if (input.taxAmount > 0) {
    lines.push({ accountId: tax.id, creditAmount: input.taxAmount });
  }
  if (input.serviceChargeAmount > 0) {
    lines.push({
      accountId: serviceCharge.id,
      creditAmount: input.serviceChargeAmount,
    });
  }

  await createJournalEntry(tx, tenant, {
    sourceType: "order",
    sourceId: input.orderId,
    businessDate: input.businessDate,
    description: `${input.paymentMethod === "cash" ? "Cash" : "QRIS"} sale ${input.orderNumber}`,
    createdByUserId: input.actorId,
    lines,
  });

  if (input.paymentMethod === "cash") {
    await tx.cashLedgerEntry.upsert({
      where: {
        outletId_sourceType_sourceId: {
          outletId: tenant.outletId,
          sourceType: "order",
          sourceId: input.paymentId,
        },
      },
      update: {},
      create: {
        organizationId: tenant.organizationId,
        outletId: tenant.outletId,
        sourceType: "order",
        sourceId: input.paymentId,
        businessDate: input.businessDate,
        direction: "in",
        amount: new Prisma.Decimal(input.totalAmount),
        description: `Cash payment for ${input.orderNumber}`,
      },
    });
  }
}

export async function createSalesAccountingForPaidCashOrder(
  tx: TransactionClient,
  input: Omit<Parameters<typeof createSalesAccountingForPaidOrder>[1], "paymentMethod">,
) {
  return createSalesAccountingForPaidOrder(tx, {
    ...input,
    paymentMethod: "cash",
  });
}

export async function createSalesAccountingForRefund(
  tx: TransactionClient,
  input: {
    organizationId: string;
    outletId: string;
    actorId: string;
    refundId: string;
    orderNumber: string;
    paymentMethod: "cash" | "qris";
    businessDate: string;
    subtotalAmount: number;
    discountAmount: number;
    taxAmount: number;
    serviceChargeAmount: number;
    totalAmount: number;
  },
) {
  const tenant: TenantContext = { userId: input.actorId, organizationId: input.organizationId, outletId: input.outletId, role: "admin" };
  const accounts = await ensureDefaultAccountingSetup(tenant, tx);
  const payment = accounts.get(input.paymentMethod === "cash" ? "1000" : "1100");
  const sales = accounts.get("4000");
  const service = accounts.get("4010");
  const tax = accounts.get("2100");
  if (!payment || !sales || !service || !tax) throw new ValidationError("Accounting accounts are not configured.");
  const lines = [
    { accountId: sales.id, debitAmount: roundMoney(input.subtotalAmount - input.discountAmount) },
    { accountId: payment.id, creditAmount: input.totalAmount },
  ];
  if (input.taxAmount > 0) lines.push({ accountId: tax.id, debitAmount: input.taxAmount });
  if (input.serviceChargeAmount > 0) lines.push({ accountId: service.id, debitAmount: input.serviceChargeAmount });
  await createJournalEntry(tx, tenant, {
    sourceType: "order", sourceId: input.refundId, businessDate: input.businessDate,
    description: `Refund ${input.orderNumber}`, createdByUserId: input.actorId, lines,
  });
  if (input.paymentMethod === "cash") {
    await tx.cashLedgerEntry.upsert({
      where: { outletId_sourceType_sourceId: { outletId: input.outletId, sourceType: "order", sourceId: input.refundId } },
      update: {},
      create: { organizationId: input.organizationId, outletId: input.outletId, sourceType: "order", sourceId: input.refundId,
        businessDate: input.businessDate, direction: "out", amount: new Prisma.Decimal(input.totalAmount), description: `Cash refund ${input.orderNumber}` },
    });
  }
}

export async function getAccountsAndCategories() {
  const tenant = await requireTenantContext(["owner", "admin"]);
  await requireModuleEnabled("accountingEnabled");
  await ensureDefaultAccountingSetup(tenant);
  const [accounts, expenseCategories] = await Promise.all([
    prisma.account.findMany({ where: { organizationId: tenant.organizationId }, orderBy: [{ code: "asc" }] }),
    prisma.expenseCategory.findMany({ where: { organizationId: tenant.organizationId }, orderBy: [{ name: "asc" }] }),
  ]);

  return {
    accounts: accounts.map(mapAccount),
    expenseCategories: expenseCategories.map(mapExpenseCategory),
  };
}

export async function createAccountFromPayload(payload: Record<string, unknown>) {
  const tenant = await requireTenantContext(["owner", "admin"]);
  await requireModuleEnabled("accountingEnabled");
  const code = optionalString(payload.code) ?? "";
  const name = optionalString(payload.name) ?? "";
  const type = optionalString(payload.type) ?? "";
  const allowedTypes = ["asset", "income", "expense", "liability", "equity"] as const;
  const fieldErrors: Record<string, string> = {};

  if (!code) fieldErrors.code = "Account code is required.";
  if (!name) fieldErrors.name = "Account name is required.";
  if (!allowedTypes.includes(type as (typeof allowedTypes)[number])) {
    fieldErrors.type = "Choose a valid account type.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError("Account validation failed.", fieldErrors);
  }

  const account = await prisma.account.create({
    data: {
      organizationId: tenant.organizationId,
      code,
      name,
      type: type as (typeof allowedTypes)[number],
      isActive: toBoolean(payload.isActive, true),
    },
  });

  return mapAccount(account);
}

export async function updateAccountFromPayload(
  id: string,
  payload: Record<string, unknown>,
) {
  const tenant = await requireTenantContext(["owner", "admin"]);
  await requireModuleEnabled("accountingEnabled");
  const existing = await prisma.account.findFirst({ where: { id, organizationId: tenant.organizationId } });
  if (!existing) throw new NotFoundError("Account was not found.");

  const account = await prisma.account.update({
    where: { id, organizationId: tenant.organizationId },
    data: {
      name: optionalString(payload.name) ?? existing.name,
      isActive: toBoolean(payload.isActive, existing.isActive),
    },
  });

  return mapAccount(account);
}

export async function getJournalEntryList() {
  const tenant = await requireTenantContext(["owner", "admin"]);
  await requireModuleEnabled("accountingEnabled");
  const entries = await prisma.journalEntry.findMany({
    where: { organizationId: tenant.organizationId, outletId: tenant.outletId },
    include: {
      lines: {
        include: { account: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return entries.map(mapJournalEntry);
}

export async function getExpenseList() {
  const tenant = await requireTenantContext(["owner", "admin"]);
  await requireModuleEnabled("accountingEnabled");
  const expenses = await prisma.expense.findMany({
    where: { organizationId: tenant.organizationId, outletId: tenant.outletId },
    include: { category: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return expenses.map(mapExpense);
}

export async function createExpenseFromPayload(
  payload: Record<string, unknown>,
  actor: User,
) {
  const tenant = await requireTenantContext(["owner", "admin"]);
  await requireModuleEnabled("accountingEnabled");
  const categoryId = optionalString(payload.categoryId) ?? "";
  const amount = parsePositiveMoney(payload.amount);
  const businessDate = parseBusinessDate(payload.businessDate);
  const description = optionalString(payload.description) ?? "";
  const paymentSource = payload.paymentSource === "qris" ? "qris" : "cash";

  if (!description) {
    throw new ValidationError("Expense validation failed.", {
      description: "Description is required.",
    });
  }

  return withTenantTransaction(tenant, async (tx) => {
    const accounts = await ensureDefaultAccountingSetup(tenant, tx);
    const category = await tx.expenseCategory.findFirst({
      where: { id: categoryId, organizationId: tenant.organizationId, isActive: true },
      include: { account: true },
    });
    if (!category) {
      throw new ValidationError("Expense category is invalid.", {
        categoryId: "Choose an active expense category.",
      });
    }

    const paymentAccount = accounts.get(paymentSource === "cash" ? "1000" : "1100");
    if (!paymentAccount) {
      throw new ValidationError("Accounting accounts are not configured.");
    }

    const expense = await tx.expense.create({
      data: {
        organizationId: tenant.organizationId,
        outletId: tenant.outletId,
        categoryId,
        amount: new Prisma.Decimal(amount),
        businessDate,
        paymentSource,
        description,
        createdByUserId: actor.id,
      },
      include: { category: true },
    });

    await createJournalEntry(tx, tenant, {
      sourceType: "expense",
      sourceId: expense.id,
      businessDate,
      description,
      createdByUserId: actor.id,
      lines: [
        { accountId: category.accountId, debitAmount: Number(amount) },
        { accountId: paymentAccount.id, creditAmount: Number(amount) },
      ],
    });

    if (paymentSource === "cash") {
      await tx.cashLedgerEntry.create({
        data: {
          organizationId: tenant.organizationId,
          outletId: tenant.outletId,
          sourceType: "expense",
          sourceId: expense.id,
          businessDate,
          direction: "out",
          amount: new Prisma.Decimal(amount),
          description,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        organizationId: tenant.organizationId,
        outletId: tenant.outletId,
        action: "accounting.expense.created",
        entityType: "expense",
        entityId: expense.id,
      },
    });

    return mapExpense(expense);
  });
}

export async function getCashMovementList() {
  const tenant = await requireTenantContext(["owner", "admin"]);
  await requireModuleEnabled("accountingEnabled");
  const movements = await prisma.cashMovement.findMany({
    where: { organizationId: tenant.organizationId, outletId: tenant.outletId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return movements.map(mapCashMovement);
}

export async function createCashMovementFromPayload(
  payload: Record<string, unknown>,
  actor: User,
) {
  const tenant = await requireTenantContext(["owner", "admin"]);
  await requireModuleEnabled("accountingEnabled");
  const type = payload.type === "cash_out" ? "cash_out" : "cash_in";
  const amount = parsePositiveMoney(payload.amount);
  const businessDate = parseBusinessDate(payload.businessDate);
  const reason = optionalString(payload.reason) ?? "";
  if (!reason) {
    throw new ValidationError("Cash movement validation failed.", {
      reason: "Reason is required.",
    });
  }

  return withTenantTransaction(tenant, async (tx) => {
    const accounts = await ensureDefaultAccountingSetup(tenant, tx);
    const cash = accounts.get("1000");
    const equity = accounts.get("3000");
    if (!cash || !equity) {
      throw new ValidationError("Accounting accounts are not configured.");
    }

    const movement = await tx.cashMovement.create({
      data: {
        organizationId: tenant.organizationId,
        outletId: tenant.outletId,
        type,
        amount: new Prisma.Decimal(amount),
        businessDate,
        reason,
        createdByUserId: actor.id,
      },
    });

    await createJournalEntry(tx, tenant, {
      sourceType: "cash_movement",
      sourceId: movement.id,
      businessDate,
      description: reason,
      createdByUserId: actor.id,
      lines:
        type === "cash_in"
          ? [
              { accountId: cash.id, debitAmount: Number(amount) },
              { accountId: equity.id, creditAmount: Number(amount) },
            ]
          : [
              { accountId: equity.id, debitAmount: Number(amount) },
              { accountId: cash.id, creditAmount: Number(amount) },
            ],
    });

    await tx.cashLedgerEntry.create({
      data: {
        organizationId: tenant.organizationId,
        outletId: tenant.outletId,
        sourceType: "cash_movement",
        sourceId: movement.id,
        businessDate,
        direction: type === "cash_in" ? "in" : "out",
        amount: new Prisma.Decimal(amount),
        description: reason,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        organizationId: tenant.organizationId,
        outletId: tenant.outletId,
        action: "accounting.cash_movement.created",
        entityType: "cash_movement",
        entityId: movement.id,
      },
    });

    return mapCashMovement(movement);
  });
}

function withNamedCashReason(prefix: string, payload: Record<string, unknown>) {
  const reason = optionalString(payload.reason);
  return {
    ...payload,
    reason: reason ? `${prefix}: ${reason}` : prefix,
  };
}

export async function createOpeningCashFromPayload(
  payload: Record<string, unknown>,
  actor: User,
) {
  return createCashMovementFromPayload(
    {
      ...withNamedCashReason("Opening cash", payload),
      type: "cash_in",
    },
    actor,
  );
}

export async function createCashDropFromPayload(
  payload: Record<string, unknown>,
  actor: User,
) {
  return createCashMovementFromPayload(
    {
      ...withNamedCashReason("Cash drop", payload),
      type: "cash_out",
    },
    actor,
  );
}

async function getExpectedCashForBusinessDate(
  tx: TransactionClient,
  tenant: TenantContext,
  businessDate: string,
) {
  const entries = await tx.cashLedgerEntry.findMany({
    where: { organizationId: tenant.organizationId, outletId: tenant.outletId, businessDate },
    select: { amount: true, direction: true },
  });

  return roundMoney(
    entries.reduce((sum, entry) => {
      const amount = Number(entry.amount);
      return entry.direction === "out" ? sum - amount : sum + amount;
    }, 0),
  );
}

export async function getDailyCloseList() {
  const tenant = await requireTenantContext(["owner", "admin"]);
  await requireModuleEnabled("accountingEnabled");
  const closes = await prisma.dailyClose.findMany({
    where: { organizationId: tenant.organizationId, outletId: tenant.outletId },
    orderBy: { businessDate: "desc" },
    take: 100,
  });

  return closes.map(mapDailyClose);
}

export async function createDailyCloseFromPayload(
  payload: Record<string, unknown>,
  actor: User,
) {
  const tenant = await requireTenantContext(["owner", "admin"]);
  await requireModuleEnabled("accountingEnabled");
  const businessDate = parseBusinessDate(payload.businessDate);
  const countedCashAmount = parsePositiveMoney(payload.countedCashAmount, "countedCashAmount");

  return withTenantTransaction(tenant, async (tx) => {
    const existing = await tx.dailyClose.findFirst({ where: { organizationId: tenant.organizationId, outletId: tenant.outletId, businessDate } });
    if (existing) {
      throw new ValidationError("Business date has already been closed.", {
        businessDate: "Choose an open business date.",
      });
    }

    const accounts = await ensureDefaultAccountingSetup(tenant, tx);
    const cash = accounts.get("1000");
    const equity = accounts.get("3000");
    if (!cash || !equity) {
      throw new ValidationError("Accounting accounts are not configured.");
    }

    const expectedCashAmount = await getExpectedCashForBusinessDate(tx, tenant, businessDate);
    const differenceAmount = roundMoney(Number(countedCashAmount) - expectedCashAmount);
    const close = await tx.dailyClose.create({
      data: {
        organizationId: tenant.organizationId,
        outletId: tenant.outletId,
        businessDate,
        expectedCashAmount: new Prisma.Decimal(expectedCashAmount),
        countedCashAmount: new Prisma.Decimal(countedCashAmount),
        differenceAmount: new Prisma.Decimal(differenceAmount),
        closedByUserId: actor.id,
      },
    });

    if (differenceAmount !== 0) {
      await createJournalEntry(tx, tenant, {
        sourceType: "daily_close",
        sourceId: close.id,
        businessDate,
        description: `Daily close cash difference ${businessDate}`,
        createdByUserId: actor.id,
        lines:
          differenceAmount > 0
            ? [
                { accountId: cash.id, debitAmount: Math.abs(differenceAmount) },
                { accountId: equity.id, creditAmount: Math.abs(differenceAmount) },
              ]
            : [
                { accountId: equity.id, debitAmount: Math.abs(differenceAmount) },
                { accountId: cash.id, creditAmount: Math.abs(differenceAmount) },
              ],
      });

      await tx.cashLedgerEntry.create({
        data: {
          organizationId: tenant.organizationId,
          outletId: tenant.outletId,
          sourceType: "daily_close",
          sourceId: close.id,
          businessDate,
          direction: differenceAmount > 0 ? "in" : "out",
          amount: new Prisma.Decimal(Math.abs(differenceAmount)),
          description: `Daily close cash difference ${businessDate}`,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        organizationId: tenant.organizationId,
        outletId: tenant.outletId,
        action: "accounting.daily_close.created",
        entityType: "daily_close",
        entityId: close.id,
      },
    });

    return mapDailyClose(close);
  });
}

export async function getAccountingReport(url: URL): Promise<AccountingReport> {
  const tenant = await requireTenantContext(["owner", "admin"]);
  const settings = await requireModuleEnabled("accountingEnabled");
  await ensureDefaultAccountingSetup(tenant);
  const today = getQueueBusinessDate(
    new Date(),
    settings.timeZone,
    settings.businessDayStartTime,
  );
  const dateFrom = url.searchParams.get("dateFrom")
    ? parseBusinessDate(url.searchParams.get("dateFrom"), "dateFrom")
    : today;
  const dateTo = url.searchParams.get("dateTo")
    ? parseBusinessDate(url.searchParams.get("dateTo"), "dateTo")
    : dateFrom;

  const [ledger, journalEntries, closes] = await Promise.all([
    prisma.cashLedgerEntry.findMany({
      where: { organizationId: tenant.organizationId, outletId: tenant.outletId, businessDate: { gte: dateFrom, lte: dateTo } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.journalEntry.findMany({
      where: { organizationId: tenant.organizationId, outletId: tenant.outletId, businessDate: { gte: dateFrom, lte: dateTo } },
      include: { lines: { include: { account: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.dailyClose.findMany({
      where: { organizationId: tenant.organizationId, outletId: tenant.outletId, businessDate: { gte: dateFrom, lte: dateTo } },
      orderBy: { businessDate: "desc" },
      take: 100,
    }),
  ]);

  const incomeAmount = roundMoney(
    journalEntries.reduce(
      (sum, entry) =>
        sum +
        entry.lines
          .filter((line) => line.account.type === "income")
          .reduce((lineSum, line) => lineSum + Number(line.creditAmount), 0),
      0,
    ),
  );
  const expenseAmount = roundMoney(
    journalEntries.reduce(
      (sum, entry) =>
        sum +
        entry.lines
          .filter((line) => line.account.type === "expense")
          .reduce((lineSum, line) => lineSum + Number(line.debitAmount), 0),
      0,
    ),
  );
  const cashBalance = roundMoney(
    ledger.reduce(
      (sum, entry) =>
        entry.direction === "out" ? sum - Number(entry.amount) : sum + Number(entry.amount),
      0,
    ),
  );

  return {
    dateRange: { dateFrom, dateTo },
    cashBalance,
    incomeAmount,
    expenseAmount,
    journalCount: journalEntries.length,
    cashLedger: ledger.map(mapCashLedgerEntry),
    dailyCloses: closes.map(mapDailyClose),
  };
}
