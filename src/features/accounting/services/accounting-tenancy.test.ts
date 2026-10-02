import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccountsAndCategories, getCashMovementList, getDailyCloseList, getExpenseList, getJournalEntryList } from "./accounting-service";

const mocks = vi.hoisted(() => ({
  accountFindMany: vi.fn(), categoryFindMany: vi.fn(), journalFindMany: vi.fn(), expenseFindMany: vi.fn(), cashFindMany: vi.fn(), closeFindMany: vi.fn(),
  accountUpsert: vi.fn(), categoryUpsert: vi.fn(), requireTenantContext: vi.fn(), requireModuleEnabled: vi.fn(),
}));
vi.mock("@/features/auth/services/session-service", () => ({ requireTenantContext: mocks.requireTenantContext }));
vi.mock("@/features/catalog/services/module-config", () => ({ requireModuleEnabled: mocks.requireModuleEnabled }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  account: { findMany: mocks.accountFindMany, upsert: mocks.accountUpsert },
  expenseCategory: { findMany: mocks.categoryFindMany, upsert: mocks.categoryUpsert },
  journalEntry: { findMany: mocks.journalFindMany }, expense: { findMany: mocks.expenseFindMany },
  cashMovement: { findMany: mocks.cashFindMany }, dailyClose: { findMany: mocks.closeFindMany },
} }));

describe("accounting tenant reads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireTenantContext.mockResolvedValue({ userId: "owner-1", organizationId: "org-a", outletId: "outlet-a", role: "owner" });
    mocks.requireModuleEnabled.mockResolvedValue({});
    mocks.accountUpsert.mockImplementation(async ({ create }: { create: { code: string } }) => ({ ...create, id: create.code }));
    mocks.categoryUpsert.mockResolvedValue({});
    for (const query of [mocks.accountFindMany, mocks.categoryFindMany, mocks.journalFindMany, mocks.expenseFindMany, mocks.cashFindMany, mocks.closeFindMany]) query.mockResolvedValue([]);
  });

  it("reads only this organization's accounts and this outlet's operational books", async () => {
    await getAccountsAndCategories();
    await getJournalEntryList();
    await getExpenseList();
    await getCashMovementList();
    await getDailyCloseList();

    expect(mocks.accountFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-a" } }));
    expect(mocks.categoryFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-a" } }));
    for (const query of [mocks.journalFindMany, mocks.expenseFindMany, mocks.cashFindMany, mocks.closeFindMany]) {
      expect(query).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-a", outletId: "outlet-a" } }));
    }
  });
});
