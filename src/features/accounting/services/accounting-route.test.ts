import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "@/lib/api-response";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireModuleEnabled: vi.fn(),
  getAccountsAndCategories: vi.fn(),
  createAccountFromPayload: vi.fn(),
  updateAccountFromPayload: vi.fn(),
  getJournalEntryList: vi.fn(),
  getExpenseList: vi.fn(),
  createExpenseFromPayload: vi.fn(),
  getCashMovementList: vi.fn(),
  createCashMovementFromPayload: vi.fn(),
  createOpeningCashFromPayload: vi.fn(),
  createCashDropFromPayload: vi.fn(),
  getDailyCloseList: vi.fn(),
  createDailyCloseFromPayload: vi.fn(),
  getAccountingReport: vi.fn(),
}));

vi.mock("@/features/auth/services/session-service", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/features/catalog/services/module-config", () => ({
  requireModuleEnabled: mocks.requireModuleEnabled,
}));

vi.mock("@/features/accounting/services/accounting-service", () => ({
  getAccountsAndCategories: mocks.getAccountsAndCategories,
  createAccountFromPayload: mocks.createAccountFromPayload,
  updateAccountFromPayload: mocks.updateAccountFromPayload,
  getJournalEntryList: mocks.getJournalEntryList,
  getExpenseList: mocks.getExpenseList,
  createExpenseFromPayload: mocks.createExpenseFromPayload,
  getCashMovementList: mocks.getCashMovementList,
  createCashMovementFromPayload: mocks.createCashMovementFromPayload,
  createOpeningCashFromPayload: mocks.createOpeningCashFromPayload,
  createCashDropFromPayload: mocks.createCashDropFromPayload,
  getDailyCloseList: mocks.getDailyCloseList,
  createDailyCloseFromPayload: mocks.createDailyCloseFromPayload,
  getAccountingReport: mocks.getAccountingReport,
}));

const adminUser = { id: "admin-1", role: "admin" as const };

describe("accounting API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireModuleEnabled.mockResolvedValue({});
  });

  describe("GET /api/accounting/accounts", () => {
    it("returns forbidden if the user is not an admin", async () => {
      mocks.requireUser.mockRejectedValue(new ForbiddenError());
      const { GET } = await import("@/app/api/accounting/accounts/route");

      const response = await GET();

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: "You do not have permission to perform this action.",
      });
      expect(mocks.requireUser).toHaveBeenCalledWith(["admin"]);
      expect(mocks.getAccountsAndCategories).not.toHaveBeenCalled();
    });

    it("returns forbidden if the accounting module is disabled", async () => {
      mocks.requireUser.mockResolvedValue(adminUser);
      mocks.requireModuleEnabled.mockRejectedValue(new ForbiddenError("Accounting module is disabled."));
      const { GET } = await import("@/app/api/accounting/accounts/route");

      const response = await GET();

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Accounting module is disabled." });
      expect(mocks.getAccountsAndCategories).not.toHaveBeenCalled();
    });

    it("returns accounts and expense categories successfully", async () => {
      mocks.requireUser.mockResolvedValue(adminUser);
      const mockResult = { accounts: [], expenseCategories: [] };
      mocks.getAccountsAndCategories.mockResolvedValue(mockResult);
      const { GET } = await import("@/app/api/accounting/accounts/route");

      const response = await GET();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(mockResult);
    });
  });

  describe("POST /api/accounting/accounts", () => {
    it("creates account successfully for admin", async () => {
      mocks.requireUser.mockResolvedValue(adminUser);
      const mockAccount = { id: "acct-1", code: "1000", name: "Cash" };
      mocks.createAccountFromPayload.mockResolvedValue(mockAccount);
      const { POST } = await import("@/app/api/accounting/accounts/route");

      const request = new Request("http://localhost/api/accounting/accounts", {
        method: "POST",
        body: JSON.stringify({ code: "1000", name: "Cash", type: "asset" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ account: mockAccount });
      expect(mocks.createAccountFromPayload).toHaveBeenCalledWith({
        code: "1000",
        name: "Cash",
        type: "asset",
      });
    });
  });

  describe("PATCH /api/accounting/accounts/[id]", () => {
    it("updates account successfully", async () => {
      mocks.requireUser.mockResolvedValue(adminUser);
      const mockAccount = { id: "acct-1", code: "1000", name: "Cash Drawer" };
      mocks.updateAccountFromPayload.mockResolvedValue(mockAccount);
      const { PATCH } = await import("@/app/api/accounting/accounts/[id]/route");

      const request = new Request("http://localhost/api/accounting/accounts/acct-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Cash Drawer" }),
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: "acct-1" }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ account: mockAccount });
      expect(mocks.updateAccountFromPayload).toHaveBeenCalledWith("acct-1", {
        name: "Cash Drawer",
      });
    });
  });

  describe("GET /api/accounting/journal-entries", () => {
    it("returns journal entry list successfully", async () => {
      mocks.requireUser.mockResolvedValue(adminUser);
      const mockList = [{ id: "je-1", entryNumber: "JE-100" }];
      mocks.getJournalEntryList.mockResolvedValue(mockList);
      const { GET } = await import("@/app/api/accounting/journal-entries/route");

      const response = await GET();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ journalEntries: mockList });
    });
  });

  describe("GET /api/accounting/expenses", () => {
    it("returns expense list successfully", async () => {
      mocks.requireUser.mockResolvedValue(adminUser);
      const mockList = [{ id: "exp-1", amount: 15000 }];
      mocks.getExpenseList.mockResolvedValue(mockList);
      const { GET } = await import("@/app/api/accounting/expenses/route");

      const response = await GET();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ expenses: mockList });
    });
  });

  describe("POST /api/accounting/expenses", () => {
    it("records expense successfully", async () => {
      mocks.requireUser.mockResolvedValue(adminUser);
      const mockExpense = { id: "exp-1", amount: 15000 };
      mocks.createExpenseFromPayload.mockResolvedValue(mockExpense);
      const { POST } = await import("@/app/api/accounting/expenses/route");

      const request = new Request("http://localhost/api/accounting/expenses", {
        method: "POST",
        body: JSON.stringify({ amount: "15000", description: "Coffee beans" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ expense: mockExpense });
      expect(mocks.createExpenseFromPayload).toHaveBeenCalledWith(
        { amount: "15000", description: "Coffee beans" },
        adminUser,
      );
    });
  });

  describe("GET /api/accounting/cash-movements", () => {
    it("returns cash movements successfully", async () => {
      mocks.requireUser.mockResolvedValue(adminUser);
      const mockList = [{ id: "cm-1", type: "cash_in" }];
      mocks.getCashMovementList.mockResolvedValue(mockList);
      const { GET } = await import("@/app/api/accounting/cash-movements/route");

      const response = await GET();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ cashMovements: mockList });
    });
  });

  describe("POST /api/accounting/cash-movements", () => {
    it("records cash movement successfully", async () => {
      mocks.requireUser.mockResolvedValue(adminUser);
      const mockMovement = { id: "cm-1", type: "cash_in" };
      mocks.createCashMovementFromPayload.mockResolvedValue(mockMovement);
      const { POST } = await import("@/app/api/accounting/cash-movements/route");

      const request = new Request("http://localhost/api/accounting/cash-movements", {
        method: "POST",
        body: JSON.stringify({ type: "cash_in", amount: "50000", reason: "drawer float" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ cashMovement: mockMovement });
      expect(mocks.createCashMovementFromPayload).toHaveBeenCalledWith(
        { type: "cash_in", amount: "50000", reason: "drawer float" },
        adminUser,
      );
    });
  });

  describe("POST /api/accounting/opening-cash", () => {
    it("records opening cash successfully", async () => {
      mocks.requireUser.mockResolvedValue(adminUser);
      const mockMovement = { id: "cm-opening", type: "cash_in" };
      mocks.createOpeningCashFromPayload.mockResolvedValue(mockMovement);
      const { POST } = await import("@/app/api/accounting/opening-cash/route");

      const request = new Request("http://localhost/api/accounting/opening-cash", {
        method: "POST",
        body: JSON.stringify({ amount: "50000", reason: "drawer float" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ cashMovement: mockMovement });
      expect(mocks.createOpeningCashFromPayload).toHaveBeenCalledWith(
        { amount: "50000", reason: "drawer float" },
        adminUser,
      );
    });
  });

  describe("POST /api/accounting/cash-drops", () => {
    it("records cash drop successfully", async () => {
      mocks.requireUser.mockResolvedValue(adminUser);
      const mockMovement = { id: "cm-drop", type: "cash_out" };
      mocks.createCashDropFromPayload.mockResolvedValue(mockMovement);
      const { POST } = await import("@/app/api/accounting/cash-drops/route");

      const request = new Request("http://localhost/api/accounting/cash-drops", {
        method: "POST",
        body: JSON.stringify({ amount: "75000", reason: "safe deposit" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ cashMovement: mockMovement });
      expect(mocks.createCashDropFromPayload).toHaveBeenCalledWith(
        { amount: "75000", reason: "safe deposit" },
        adminUser,
      );
    });
  });

  describe("GET /api/accounting/daily-closes", () => {
    it("returns daily closes list successfully", async () => {
      mocks.requireUser.mockResolvedValue(adminUser);
      const mockList = [{ id: "close-1", businessDate: "2026-05-20" }];
      mocks.getDailyCloseList.mockResolvedValue(mockList);
      const { GET } = await import("@/app/api/accounting/daily-closes/route");

      const response = await GET();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ dailyCloses: mockList });
    });
  });

  describe("POST /api/accounting/daily-closes", () => {
    it("creates daily close successfully", async () => {
      mocks.requireUser.mockResolvedValue(adminUser);
      const mockClose = { id: "close-1", businessDate: "2026-05-20" };
      mocks.createDailyCloseFromPayload.mockResolvedValue(mockClose);
      const { POST } = await import("@/app/api/accounting/daily-closes/route");

      const request = new Request("http://localhost/api/accounting/daily-closes", {
        method: "POST",
        body: JSON.stringify({ businessDate: "2026-05-20", countedCashAmount: "250000" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ dailyClose: mockClose });
      expect(mocks.createDailyCloseFromPayload).toHaveBeenCalledWith(
        { businessDate: "2026-05-20", countedCashAmount: "250000" },
        adminUser,
      );
    });
  });

  describe("GET /api/accounting/reports", () => {
    it("returns accounting report summary successfully", async () => {
      mocks.requireUser.mockResolvedValue(adminUser);
      const mockReport = { cashBalance: 500000, incomeAmount: 750000 };
      mocks.getAccountingReport.mockResolvedValue(mockReport);
      const { GET } = await import("@/app/api/accounting/reports/route");

      const request = new NextRequest("http://localhost/api/accounting/reports?dateFrom=2026-05-20");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ report: mockReport });
      expect(mocks.getAccountingReport).toHaveBeenCalledWith(request.nextUrl);
    });
  });
});
