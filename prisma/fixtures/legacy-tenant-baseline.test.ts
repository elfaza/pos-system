import { Prisma, type PrismaClient } from "@prisma/client";
import { expect, it, vi } from "vitest";
import { loadLegacyTenantBaseline } from "./legacy-tenant-baseline";

it("refuses a database containing rows in any legacy model before inserting fixture data", async () => {
  const transaction = Object.fromEntries(
    Prisma.dmmf.datamodel.models.map((model) => {
      const delegate = model.name[0].toLowerCase() + model.name.slice(1);
      return [delegate, {
        count: vi.fn().mockResolvedValue(model.name === "AppSetting" ? 1 : 0),
        createMany: vi.fn(),
      }];
    }),
  );
  const client = {
    $transaction: (callback: (tx: typeof transaction) => Promise<void>) => callback(transaction),
  };

  await expect(loadLegacyTenantBaseline(client as unknown as PrismaClient)).rejects.toThrow("empty disposable database");
  expect(transaction.user.createMany).not.toHaveBeenCalled();
});
