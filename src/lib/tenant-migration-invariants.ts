import { Prisma } from "@prisma/client";

export const TENANT_INVARIANT_VERSION = 1;

export interface TenantIntegrityMetrics {
  nullTenantKeys: number;
  invalidOutletOrganizationPairs: number;
  usersWithoutMembership: number;
  missingOutletProductRows: number;
  missingOutletIngredientStockRows: number;
}

export interface TenantInvariantSnapshot {
  version: number;
  capturedAt: string;
  stage: "legacy" | "tenant";
  rowCounts: Record<string, number>;
  financialSums: Record<string, string>;
  tenantIntegrity: TenantIntegrityMetrics | null;
}

export interface TenantInvariantReport {
  ok: boolean;
  errors: string[];
}

export interface CreateTenantInvariantSnapshotInput {
  capturedAt: Date;
  stage: TenantInvariantSnapshot["stage"];
  rowCounts: Record<string, number>;
  financialSums: Record<string, string>;
  tenantIntegrity: TenantIntegrityMetrics | null;
}

export function createTenantInvariantSnapshot(
  input: CreateTenantInvariantSnapshotInput,
): TenantInvariantSnapshot {
  return {
    version: TENANT_INVARIANT_VERSION,
    capturedAt: input.capturedAt.toISOString(),
    stage: input.stage,
    rowCounts: input.rowCounts,
    financialSums: input.financialSums,
    tenantIntegrity: input.tenantIntegrity,
  };
}

function assertRecord(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function parseNonNegativeIntegers(
  value: unknown,
  path: string,
): Record<string, number> {
  const record = assertRecord(value, path);

  return Object.fromEntries(
    Object.entries(record).map(([key, metric]) => {
      if (!Number.isInteger(metric) || (metric as number) < 0) {
        throw new Error(`${path}.${key} must be a non-negative integer.`);
      }

      return [key, metric as number];
    }),
  );
}

function parseFinancialSums(value: unknown): Record<string, string> {
  const record = assertRecord(value, "financialSums");

  return Object.fromEntries(
    Object.entries(record).map(([key, metric]) => {
      if (typeof metric !== "string") {
        throw new Error(`financialSums.${key} must be a decimal string.`);
      }

      try {
        new Prisma.Decimal(metric);
      } catch {
        throw new Error(`financialSums.${key} must be a decimal string.`);
      }

      return [key, metric];
    }),
  );
}

function parseTenantIntegrity(value: unknown): TenantIntegrityMetrics | null {
  if (value === null) return null;

  const metrics = parseNonNegativeIntegers(value, "tenantIntegrity");
  const required = [
    "nullTenantKeys",
    "invalidOutletOrganizationPairs",
    "usersWithoutMembership",
    "missingOutletProductRows",
    "missingOutletIngredientStockRows",
  ] as const;

  for (const metric of required) {
    if (metrics[metric] === undefined) {
      throw new Error(`tenantIntegrity.${metric} is required.`);
    }
  }

  return metrics as unknown as TenantIntegrityMetrics;
}

export function parseTenantInvariantSnapshot(
  json: string,
): TenantInvariantSnapshot {
  const input = assertRecord(JSON.parse(json) as unknown, "snapshot");

  if (!Number.isInteger(input.version) || (input.version as number) < 1) {
    throw new Error("version must be a positive integer.");
  }
  if (input.stage !== "legacy" && input.stage !== "tenant") {
    throw new Error("stage must be legacy or tenant.");
  }
  if (
    typeof input.capturedAt !== "string" ||
    Number.isNaN(Date.parse(input.capturedAt))
  ) {
    throw new Error("capturedAt must be a valid date string.");
  }

  return {
    version: input.version as number,
    capturedAt: input.capturedAt,
    stage: input.stage,
    rowCounts: parseNonNegativeIntegers(input.rowCounts, "rowCounts"),
    financialSums: parseFinancialSums(input.financialSums),
    tenantIntegrity: parseTenantIntegrity(input.tenantIntegrity),
  };
}

function compareRowCounts(
  before: TenantInvariantSnapshot,
  after: TenantInvariantSnapshot,
): string[] {
  return Object.entries(before.rowCounts).flatMap(([metric, expected]) => {
    const received = after.rowCounts[metric];

    if (received === undefined) {
      return [`After snapshot is missing row count metric ${metric}.`];
    }

    if (received !== expected) {
      return [
        `Row count changed for ${metric}: expected ${expected}, received ${received}.`,
      ];
    }

    return [];
  });
}

function compareFinancialSums(
  before: TenantInvariantSnapshot,
  after: TenantInvariantSnapshot,
): string[] {
  return Object.entries(before.financialSums).flatMap(([metric, expected]) => {
    const received = after.financialSums[metric];

    if (received === undefined) {
      return [`After snapshot is missing financial metric ${metric}.`];
    }

    if (!new Prisma.Decimal(expected).equals(new Prisma.Decimal(received))) {
      return [
        `Financial sum changed for ${metric}: expected ${expected}, received ${received}.`,
      ];
    }

    return [];
  });
}

function verifyTenantIntegrity(
  tenantIntegrity: TenantIntegrityMetrics | null,
): string[] {
  if (!tenantIntegrity) {
    return ["After snapshot is missing tenant integrity metrics."];
  }

  return Object.entries(tenantIntegrity).flatMap(([metric, value]) =>
    value === 0
      ? []
      : [`Tenant integrity check ${metric} returned ${value}; expected 0.`],
  );
}

export function verifyTenantMigrationInvariants(
  before: TenantInvariantSnapshot,
  after: TenantInvariantSnapshot,
): TenantInvariantReport {
  const errors: string[] = [];

  if (before.version !== after.version) {
    errors.push(
      `Snapshot versions do not match: before ${before.version}, after ${after.version}.`,
    );
  }

  errors.push(...compareRowCounts(before, after));
  errors.push(...compareFinancialSums(before, after));
  if (after.stage === "tenant") {
    errors.push(...verifyTenantIntegrity(after.tenantIntegrity));
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
