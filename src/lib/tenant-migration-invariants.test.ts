import { describe, expect, it } from "vitest";
import {
  createTenantInvariantSnapshot,
  parseTenantInvariantSnapshot,
  ROW_COUNT_METRICS,
  TENANT_INVARIANT_VERSION,
  verifyTenantMigrationInvariants,
  type TenantInvariantSnapshot,
} from "./tenant-migration-invariants";

function snapshot(
  overrides: Partial<TenantInvariantSnapshot> = {},
): TenantInvariantSnapshot {
  return {
    version: TENANT_INVARIANT_VERSION,
    capturedAt: "2026-10-01T00:00:00.000Z",
    stage: "tenant",
    rowCounts: {
      ...Object.fromEntries(ROW_COUNT_METRICS.map((metric) => [metric, 0])),
      users: 5,
      products: 4,
      orders: 3,
      payments: 2,
    },
    financialSums: {
      orderTotalAmount: "100000.10",
      paymentAmount: "95000.10",
      refundAmount: "5000",
      expenseAmount: "12500.25",
      cashMovementAmount: "500000",
      journalDebitAmount: "607500.35",
      journalCreditAmount: "607500.35",
    },
    tenantIntegrity: {
      nullTenantKeys: 0,
      invalidOutletOrganizationPairs: 0,
      usersWithoutMembership: 0,
      missingOutletProductRows: 0,
      missingOutletIngredientStockRows: 0,
    },
    ...overrides,
  };
}

describe("tenant migration invariants", () => {
  it("rejects empty reports, unsupported versions, and non-finite decimals", () => {
    expect(() => parseTenantInvariantSnapshot(JSON.stringify(snapshot({ rowCounts: {} })))).toThrow("rowCounts must contain metrics");
    expect(() => parseTenantInvariantSnapshot(JSON.stringify(snapshot({ financialSums: {} })))).toThrow("financialSums must contain metrics");
    expect(() => parseTenantInvariantSnapshot(JSON.stringify(snapshot({ version: 99 })))).toThrow("Unsupported snapshot version");
    expect(() => parseTenantInvariantSnapshot(JSON.stringify(snapshot({ financialSums: { paymentAmount: "Infinity" } })))).toThrow("decimal string");
  });

  it("rejects a tenant snapshot being compared to a legacy target", () => {
    expect(verifyTenantMigrationInvariants(snapshot(), snapshot({ stage: "legacy", tenantIntegrity: null })).ok).toBe(false);
  });

  it("rejects an incomplete baseline report", () => {
    expect(() => parseTenantInvariantSnapshot(JSON.stringify(snapshot({ rowCounts: { users: 5 } })))).toThrow("rowCounts.sessions is required");
  });

  it("rejects unchanged but unbalanced journal sums", () => {
    const unbalanced = snapshot({ financialSums: { ...snapshot().financialSums, journalCreditAmount: "0" } });
    expect(verifyTenantMigrationInvariants(unbalanced, unbalanced).errors).toContain("Journal debit and credit sums do not balance.");
  });

  it("creates a timestamped snapshot from captured database metrics", () => {
    expect(
      createTenantInvariantSnapshot({
        capturedAt: new Date("2026-10-01T02:03:04.000Z"),
        stage: "legacy",
        rowCounts: { users: 5 },
        financialSums: { orderTotalAmount: "10.00" },
        tenantIntegrity: null,
      }),
    ).toEqual({
      version: 1,
      capturedAt: "2026-10-01T02:03:04.000Z",
      stage: "legacy",
      rowCounts: { users: 5 },
      financialSums: { orderTotalAmount: "10.00" },
      tenantIntegrity: null,
    });
  });

  it("parses a valid snapshot and rejects malformed metric values", () => {
    const valid = snapshot();

    expect(parseTenantInvariantSnapshot(JSON.stringify(valid))).toEqual(valid);
    expect(() =>
      parseTenantInvariantSnapshot(
        JSON.stringify({
          ...valid,
          rowCounts: { users: -1 },
        }),
      ),
    ).toThrow("rowCounts.users must be a non-negative integer");
    expect(() =>
      parseTenantInvariantSnapshot(
        JSON.stringify({
          ...valid,
          financialSums: { paymentAmount: "not-a-decimal" },
        }),
      ),
    ).toThrow("financialSums.paymentAmount must be a decimal string");
  });

  it("accepts unchanged counts and exact decimal financial sums", () => {
    const before = snapshot({ stage: "legacy" });
    const after = snapshot({
      financialSums: {
        ...before.financialSums,
        orderTotalAmount: "100000.100",
      },
    });

    expect(verifyTenantMigrationInvariants(before, after)).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("accepts a matching legacy restore without tenant-only metrics", () => {
    const before = snapshot({ stage: "legacy", tenantIntegrity: null });
    const restored = snapshot({ stage: "legacy", tenantIntegrity: null });

    expect(verifyTenantMigrationInvariants(before, restored)).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("reports every changed row count", () => {
    const before = snapshot();
    const after = snapshot({
      rowCounts: {
        ...before.rowCounts,
        products: 3,
        orders: 4,
      },
    });

    expect(verifyTenantMigrationInvariants(before, after).errors).toEqual(
      expect.arrayContaining([
        "Row count changed for products: expected 4, received 3.",
        "Row count changed for orders: expected 3, received 4.",
      ]),
    );
  });

  it("compares financial values without floating-point rounding", () => {
    const before = snapshot({
      financialSums: {
        ...snapshot().financialSums,
        paymentAmount: "9007199254740993.01",
      },
    });
    const after = snapshot({
      financialSums: {
        ...before.financialSums,
        paymentAmount: "9007199254740993.02",
      },
    });

    expect(verifyTenantMigrationInvariants(before, after).errors).toContain(
      "Financial sum changed for paymentAmount: expected 9007199254740993.01, received 9007199254740993.02.",
    );
  });

  it("rejects null tenant keys and broken tenant relationships", () => {
    const after = snapshot({
      tenantIntegrity: {
        nullTenantKeys: 2,
        invalidOutletOrganizationPairs: 1,
        usersWithoutMembership: 3,
        missingOutletProductRows: 4,
        missingOutletIngredientStockRows: 5,
      },
    });

    expect(verifyTenantMigrationInvariants(snapshot(), after).errors).toEqual(
      expect.arrayContaining([
        "Tenant integrity check nullTenantKeys returned 2; expected 0.",
        "Tenant integrity check invalidOutletOrganizationPairs returned 1; expected 0.",
        "Tenant integrity check usersWithoutMembership returned 3; expected 0.",
        "Tenant integrity check missingOutletProductRows returned 4; expected 0.",
        "Tenant integrity check missingOutletIngredientStockRows returned 5; expected 0.",
      ]),
    );
  });

  it("rejects snapshots with incompatible formats or missing metrics", () => {
    const before = snapshot();
    const after = snapshot({
      version: 99,
      rowCounts: { users: 5 },
      financialSums: { orderTotalAmount: "100000.10" },
    });

    expect(verifyTenantMigrationInvariants(before, after).errors).toEqual(
      expect.arrayContaining([
        "Snapshot versions do not match: before 1, after 99.",
        "After snapshot is missing row count metric products.",
        "After snapshot is missing financial metric paymentAmount.",
      ]),
    );
  });
});
