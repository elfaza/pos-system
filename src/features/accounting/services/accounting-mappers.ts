import { Prisma } from "@prisma/client";
import type {
  AccountRecord,
  CashLedgerRecord,
  CashMovementRecord,
  DailyCloseRecord,
  ExpenseCategoryRecord,
  ExpenseRecord,
  JournalEntryRecord,
} from "../types";

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return Number(value);
}

function toIso(value: Date): string {
  return value.toISOString();
}

export function mapAccount(account: {
  id: string;
  code: string;
  name: string;
  type: AccountRecord["type"];
  isActive: boolean;
}): AccountRecord {
  return {
    id: account.id,
    code: account.code,
    name: account.name,
    type: account.type,
    isActive: account.isActive,
  };
}

export function mapExpenseCategory(category: {
  id: string;
  name: string;
  accountId: string;
  isActive: boolean;
}): ExpenseCategoryRecord {
  return {
    id: category.id,
    name: category.name,
    accountId: category.accountId,
    isActive: category.isActive,
  };
}

export function mapJournalEntry(entry: {
  id: string;
  entryNumber: string;
  sourceType: JournalEntryRecord["sourceType"];
  sourceId: string;
  businessDate: string;
  description: string;
  createdAt: Date;
  lines: {
    id: string;
    debitAmount: Prisma.Decimal | number | string;
    creditAmount: Prisma.Decimal | number | string;
    account: {
      code: string;
      name: string;
    };
  }[];
}): JournalEntryRecord {
  return {
    id: entry.id,
    entryNumber: entry.entryNumber,
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    businessDate: entry.businessDate,
    description: entry.description,
    createdAt: toIso(entry.createdAt),
    lines: entry.lines.map((line) => ({
      id: line.id,
      accountCode: line.account.code,
      accountName: line.account.name,
      debitAmount: toNumber(line.debitAmount),
      creditAmount: toNumber(line.creditAmount),
    })),
  };
}

export function mapExpense(expense: {
  id: string;
  amount: Prisma.Decimal | number | string;
  businessDate: string;
  paymentSource: ExpenseRecord["paymentSource"];
  description: string;
  createdAt: Date;
  category: {
    name: string;
  };
}): ExpenseRecord {
  return {
    id: expense.id,
    categoryName: expense.category.name,
    amount: toNumber(expense.amount),
    businessDate: expense.businessDate,
    paymentSource: expense.paymentSource,
    description: expense.description,
    createdAt: toIso(expense.createdAt),
  };
}

export function mapCashMovement(movement: {
  id: string;
  type: CashMovementRecord["type"];
  amount: Prisma.Decimal | number | string;
  businessDate: string;
  reason: string;
  createdAt: Date;
}): CashMovementRecord {
  return {
    id: movement.id,
    type: movement.type,
    amount: toNumber(movement.amount),
    businessDate: movement.businessDate,
    reason: movement.reason,
    createdAt: toIso(movement.createdAt),
  };
}

export function mapCashLedgerEntry(entry: {
  id: string;
  sourceType: string;
  sourceId: string;
  businessDate: string;
  direction: string;
  amount: Prisma.Decimal | number | string;
  description: string;
  createdAt: Date;
}): CashLedgerRecord {
  return {
    id: entry.id,
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    businessDate: entry.businessDate,
    direction: entry.direction === "out" ? "out" : "in",
    amount: toNumber(entry.amount),
    description: entry.description,
    createdAt: toIso(entry.createdAt),
  };
}

export function mapDailyClose(close: {
  id: string;
  businessDate: string;
  expectedCashAmount: Prisma.Decimal | number | string;
  countedCashAmount: Prisma.Decimal | number | string;
  differenceAmount: Prisma.Decimal | number | string;
  closedAt: Date;
}): DailyCloseRecord {
  return {
    id: close.id,
    businessDate: close.businessDate,
    expectedCashAmount: toNumber(close.expectedCashAmount),
    countedCashAmount: toNumber(close.countedCashAmount),
    differenceAmount: toNumber(close.differenceAmount),
    closedAt: toIso(close.closedAt),
  };
}
