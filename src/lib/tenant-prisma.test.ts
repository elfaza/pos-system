import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.TENANT_TRANSACTION_TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;

integrationDescribe("tenant Prisma transactions (PostgreSQL)", () => {
  let client: PrismaClient;
  let withTenantTransaction: Awaited<ReturnType<typeof loadRunner>>;

  async function loadRunner() {
    const { createTenantTransactionRunner } = await import("./tenant-prisma");
    return createTenantTransactionRunner(client);
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    const url = new URL(databaseUrl!);
    url.searchParams.set("connection_limit", "1");
    client = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    withTenantTransaction = await loadRunner();
  });

  afterAll(async () => {
    await client?.$disconnect();
  });

  it("sets tenant values locally and clears them after commit before the next transaction", async () => {
    const first = await withTenantTransaction(
      { organizationId: "org-first", outletId: "outlet-first" },
      async (transaction) => transaction.$queryRaw<Array<{ organization_id: string; outlet_id: string }>>`
        SELECT current_setting('app.organization_id', true) AS organization_id,
               current_setting('app.outlet_id', true) AS outlet_id
      `,
    );
    expect(first[0]).toEqual({ organization_id: "org-first", outlet_id: "outlet-first" });
    const afterCommit = await client.$queryRaw<Array<{ organization_id: string | null; outlet_id: string | null }>>`
      SELECT current_setting('app.organization_id', true) AS organization_id,
             current_setting('app.outlet_id', true) AS outlet_id
    `;
    expect(afterCommit[0]).toEqual({ organization_id: "", outlet_id: "" });

    const second = await withTenantTransaction(
      { organizationId: "org-second", outletId: "outlet-second" },
      async (transaction) => transaction.$queryRaw<Array<{ organization_id: string; outlet_id: string }>>`
        SELECT current_setting('app.organization_id', true) AS organization_id,
               current_setting('app.outlet_id', true) AS outlet_id
      `,
    );
    expect(second[0]).toEqual({ organization_id: "org-second", outlet_id: "outlet-second" });
  });

  it("clears tenant values when the transaction rolls back", async () => {
    await expect(withTenantTransaction(
      { organizationId: "org-rollback", outletId: "outlet-rollback" },
      async () => { throw new Error("force rollback"); },
    )).rejects.toThrow("force rollback");

    const afterRollback = await client.$queryRaw<Array<{ organization_id: string | null; outlet_id: string | null }>>`
      SELECT current_setting('app.organization_id', true) AS organization_id,
             current_setting('app.outlet_id', true) AS outlet_id
    `;
    expect(afterRollback[0]).toEqual({ organization_id: "", outlet_id: "" });

    const values = await withTenantTransaction(
      { organizationId: "org-after-rollback", outletId: "outlet-after-rollback" },
      async (transaction) => transaction.$queryRaw<Array<{ organization_id: string; outlet_id: string }>>`
        SELECT current_setting('app.organization_id', true) AS organization_id,
               current_setting('app.outlet_id', true) AS outlet_id
      `,
    );
    expect(values[0]).toEqual({
      organization_id: "org-after-rollback",
      outlet_id: "outlet-after-rollback",
    });
  });
});
