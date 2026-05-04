export type AccountType = "asset" | "income" | "expense" | "liability" | "equity";
export type CashMovementType = "cash_in" | "cash_out";
export type ExpensePaymentSource = "cash" | "qris";

export interface AccountRecord {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  isActive: boolean;
}

export interface ExpenseCategoryRecord {
  id: string;
  name: string;
  accountId: string;
  isActive: boolean;
}

export interface JournalEntryRecord {
  id: string;
  entryNumber: string;
  sourceType: "order" | "expense" | "cash_movement" | "daily_close";
  sourceId: string;
  businessDate: string;
  description: string;
  createdAt: string;
  lines: {
    id: string;
    accountCode: string;
    accountName: string;
    debitAmount: number;
    creditAmount: number;
  }[];
}

export interface ExpenseRecord {
  id: string;
  categoryName: string;
  amount: number;
  businessDate: string;
  paymentSource: ExpensePaymentSource;
  description: string;
  createdAt: string;
}

export interface CashMovementRecord {
  id: string;
  type: CashMovementType;
  amount: number;
  businessDate: string;
  reason: string;
  createdAt: string;
}

export interface CashLedgerRecord {
  id: string;
  sourceType: string;
  sourceId: string;
  businessDate: string;
  direction: "in" | "out";
  amount: number;
  description: string;
  createdAt: string;
}

export interface DailyCloseRecord {
  id: string;
  businessDate: string;
  expectedCashAmount: number;
  countedCashAmount: number;
  differenceAmount: number;
  closedAt: string;
}

export interface AccountingReport {
  dateRange: {
    dateFrom: string;
    dateTo: string;
  };
  cashBalance: number;
  incomeAmount: number;
  expenseAmount: number;
  journalCount: number;
  cashLedger: CashLedgerRecord[];
  dailyCloses: DailyCloseRecord[];
}
