import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/lib/api-response";
import {
  createDailyCloseFromPayload,
  createExpenseFromPayload,
  createSalesAccountingForPaidCashOrder,
} from "./accounting-service";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  tx: {
    account: { upsert: vi.fn() },
    expenseCategory: { upsert: vi.fn(), findFirst: vi.fn() },
    expense: { create: vi.fn() },
    journalEntry: { upsert: vi.fn() },
    journalEntryLine: { create: vi.fn() },
    cashLedgerEntry: { upsert: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    dailyClose: { findUnique: vi.fn(), create: vi.fn() },
    activityLog: { create: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    account: mocks.tx.account,
    expenseCategory: mocks.tx.expenseCategory,
    journalEntry: mocks.tx.journalEntry,
    cashLedgerEntry: mocks.tx.cashLedgerEntry,
    dailyClose: mocks.tx.dailyClose,
  },
}));

const actor = {
  id: "admin-1",
  name: "Admin",
  email: "admin@pos.local",
  role: "admin" as const,
};

const accountsByCode: Record<string, { id: string; code: string }> = {
  "1000": { id: "cash-account", code: "1000" },
  "1100": { id: "qris-account", code: "1100" },
  "3000": { id: "equity-account", code: "3000" },
  "4000": { id: "sales-account", code: "4000" },
  "4010": { id: "service-account", code: "4010" },
  "2100": { id: "tax-account", code: "2100" },
  "5000": { id: "expense-account", code: "5000" },
};

describe("accounting service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation((callback) => callback(mocks.tx));
    mocks.tx.account.upsert.mockImplementation(({ where }: { where: { code: string } }) => ({
      id: accountsByCode[where.code].id,
      code: where.code,
    }));
    mocks.tx.expenseCategory.upsert.mockResolvedValue({});
    mocks.tx.expenseCategory.findFirst.mockResolvedValue({
      id: "category-1",
      accountId: "expense-account",
      account: { id: "expense-account" },
    });
    mocks.tx.expense.create.mockResolvedValue({
      id: "expense-1",
      amount: "25000",
      businessDate: "2026-05-04",
      paymentSource: "cash",
      description: "Paper cups",
      createdAt: new Date("2026-05-04T04:00:00.000Z"),
      category: { name: "Supplies" },
    });
    mocks.tx.journalEntry.upsert.mockResolvedValue({ id: "journal-1" });
    mocks.tx.cashLedgerEntry.upsert.mockResolvedValue({ id: "ledger-1" });
    mocks.tx.cashLedgerEntry.create.mockResolvedValue({ id: "ledger-1" });
    mocks.tx.cashLedgerEntry.findMany.mockResolvedValue([
      { amount: "100000", direction: "in" },
      { amount: "25000", direction: "out" },
    ]);
    mocks.tx.dailyClose.findUnique.mockResolvedValue(null);
    mocks.tx.dailyClose.create.mockResolvedValue({
      id: "close-1",
      businessDate: "2026-05-04",
      expectedCashAmount: "75000",
      countedCashAmount: "75000",
      differenceAmount: "0",
      closedAt: new Date("2026-05-04T10:00:00.000Z"),
    });
    mocks.tx.activityLog.create.mockResolvedValue({});
  });

  it("creates a balanced sales journal and cash ledger row for a paid cash order", async () => {
    await createSalesAccountingForPaidCashOrder(mocks.tx as never, {
      orderId: "order-1",
      orderNumber: "ORD-001",
      paymentId: "payment-1",
      businessDate: "2026-05-04",
      actorId: actor.id,
      subtotalAmount: 100000,
      discountAmount: 10000,
      taxAmount: 9900,
      serviceChargeAmount: 5000,
      totalAmount: 104900,
    });

    expect(mocks.tx.journalEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sourceType_sourceId: {
            sourceType: "order",
            sourceId: "order-1",
          },
        },
        create: expect.objectContaining({
          sourceType: "order",
          lines: {
            create: expect.arrayContaining([
              expect.objectContaining({ accountId: "cash-account" }),
              expect.objectContaining({ accountId: "sales-account" }),
              expect.objectContaining({ accountId: "tax-account" }),
              expect.objectContaining({ accountId: "service-account" }),
            ]),
          },
        }),
      }),
    );
    expect(mocks.tx.cashLedgerEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sourceType_sourceId: {
            sourceType: "order",
            sourceId: "payment-1",
          },
        },
      }),
    );
  });

  it("records a cash expense with journal lines, cash ledger, and activity log", async () => {
    const expense = await createExpenseFromPayload(
      {
        categoryId: "category-1",
        amount: "25000",
        businessDate: "2026-05-04",
        paymentSource: "cash",
        description: "Paper cups",
      },
      actor,
    );

    expect(expense.amount).toBe(25000);
    expect(mocks.tx.journalEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          sourceType: "expense",
          lines: {
            create: expect.arrayContaining([
              expect.objectContaining({ accountId: "expense-account" }),
              expect.objectContaining({ accountId: "cash-account" }),
            ]),
          },
        }),
      }),
    );
    expect(mocks.tx.cashLedgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: "expense",
          direction: "out",
        }),
      }),
    );
    expect(mocks.tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "accounting.expense.created" }),
      }),
    );
  });

  it("rejects duplicate daily closes for the same business date", async () => {
    mocks.tx.dailyClose.findUnique.mockResolvedValueOnce({ id: "close-existing" });

    await expect(
      createDailyCloseFromPayload(
        {
          businessDate: "2026-05-04",
          countedCashAmount: "75000",
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mocks.tx.dailyClose.create).not.toHaveBeenCalled();
  });
});
