import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

const models = Prisma.dmmf.datamodel.models;

function model(name: string) {
  const found = models.find((candidate) => candidate.name === name);
  expect(found, `Prisma model ${name} should exist`).toBeDefined();
  return found!;
}

function hasUnique(modelName: string, fields: string[]) {
  const target = fields.join(",");
  const metadata = model(modelName);
  return (
    metadata.uniqueFields.some((key) => key.join(",") === target) ||
    metadata.uniqueIndexes.some((key) => key.fields.join(",") === target)
  );
}

describe("outlet stock schema", () => {
  it("allows one product stock row per outlet", () => {
    expect(hasUnique("OutletProduct", ["outletId", "productId"])).toBe(true);
  });

  it("allows one ingredient stock row per outlet", () => {
    expect(hasUnique("OutletIngredientStock", ["outletId", "ingredientId"])).toBe(true);
  });

  it("keeps stock quantities decimal and preserves legacy product stock", () => {
    const quantity = model("OutletProduct").fields.find((field) => field.name === "stockQuantity");
    expect(quantity).toMatchObject({ type: "Decimal", isRequired: false });
    expect(model("Product").fields.some((field) => field.name === "stockQuantity")).toBe(true);
  });

  it("adds nullable scope fields to organization and operational roots", () => {
    for (const modelName of ["Category", "Product", "ProductVariant", "Ingredient", "Account", "ExpenseCategory"]) {
      expect(model(modelName).fields.find((field) => field.name === "organizationId")).toMatchObject({
        isRequired: false,
      });
    }

    for (const modelName of ["AppSetting", "CustomerDisplayState", "Order", "DiningTable", "StockMovement", "ActivityLog", "JournalEntry", "Expense", "CashMovement", "CashLedgerEntry", "DailyClose"]) {
      for (const fieldName of ["organizationId", "outletId"]) {
        expect(model(modelName).fields.find((field) => field.name === fieldName)).toMatchObject({
          isRequired: false,
        });
      }
    }
  });
});
