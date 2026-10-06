import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, ValidationError } from "@/lib/api-response";
import {
  adjustIngredientFromPayload,
  createIngredientFromPayload,
  deleteIngredientById,
  updateIngredientFromPayload,
} from "./inventory-service";

const mocks = vi.hoisted(() => ({
  activityLogCreate: vi.fn(),
  adjustIngredientStock: vi.fn(),
  createIngredient: vi.fn(),
  deleteUnusedIngredient: vi.fn(),
  findIngredientById: vi.fn(),
  listIngredients: vi.fn(),
  listStockMovements: vi.fn(),
  updateIngredient: vi.fn(),
  countLowStockIngredients: vi.fn(),
  requireModuleEnabled: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    activityLog: { create: mocks.activityLogCreate },
  },
}));

vi.mock("../repositories/inventory-repository", () => ({
  adjustIngredientStock: mocks.adjustIngredientStock,
  countLowStockIngredients: mocks.countLowStockIngredients,
  createIngredient: mocks.createIngredient,
  deleteUnusedIngredient: mocks.deleteUnusedIngredient,
  findIngredientById: mocks.findIngredientById,
  listIngredients: mocks.listIngredients,
  listStockMovements: mocks.listStockMovements,
  updateIngredient: mocks.updateIngredient,
}));

vi.mock("@/features/catalog/services/module-config", () => ({
  requireModuleEnabled: mocks.requireModuleEnabled,
}));

const tenant = {
  userId: "admin-1",
  organizationId: "org-1",
  outletId: "outlet-1",
  role: "owner" as const,
};

const ingredientRecord = {
  id: "ingredient-1",
  name: "Milk",
  sku: "MILK",
  unit: "ml",
  currentStock: "1000",
  lowStockThreshold: "100",
  isActive: true,
  createdAt: new Date("2026-04-28T00:00:00.000Z"),
  updatedAt: new Date("2026-04-28T00:00:00.000Z"),
};

describe("inventory service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireModuleEnabled.mockResolvedValue({});
    mocks.createIngredient.mockResolvedValue(ingredientRecord);
    mocks.deleteUnusedIngredient.mockResolvedValue("deleted");
    mocks.updateIngredient.mockResolvedValue(ingredientRecord);
    mocks.findIngredientById.mockResolvedValue(ingredientRecord);
    mocks.adjustIngredientStock.mockResolvedValue({
      ingredient: ingredientRecord,
      insufficient: false,
    });
    mocks.activityLogCreate.mockResolvedValue({});
  });

  it("creates ingredients with normalized payload values", async () => {
    await createIngredientFromPayload(
      {
        name: " Milk ",
        sku: " MILK ",
        unit: " ml ",
        currentStock: "1000.5",
        lowStockThreshold: "100",
      },
      tenant,
    );

    expect(mocks.createIngredient).toHaveBeenCalledWith(tenant, {
      name: "Milk",
      sku: "MILK",
      unit: "ml",
      currentStock: "1000.5",
      lowStockThreshold: "100",
      isActive: true,
    });
  });

  it("rejects negative ingredient stock values", async () => {
    await expect(
      createIngredientFromPayload(
        {
          name: "Milk",
          unit: "ml",
          currentStock: "-1",
          lowStockThreshold: "-2",
        },
        tenant,
      ),
    ).rejects.toMatchObject({
      fieldErrors: {
        currentStock: "Current stock must be greater than or equal to 0.",
        lowStockThreshold: "Low stock threshold must be greater than or equal to 0.",
      },
    });
    expect(mocks.createIngredient).not.toHaveBeenCalled();
  });

  it("updates ingredient master data without changing stock directly", async () => {
    await updateIngredientFromPayload(
      "ingredient-1",
      {
        name: "Milk",
        unit: "ml",
        currentStock: "-999",
        lowStockThreshold: "50",
        isActive: false,
      },
      tenant,
    );

    expect(mocks.updateIngredient).toHaveBeenCalledWith(tenant, "ingredient-1", {
      name: "Milk",
      sku: null,
      unit: "ml",
      lowStockThreshold: "50",
      isActive: false,
    });
  });

  it("requires a reason and positive quantity for adjustments", async () => {
    await expect(
      adjustIngredientFromPayload(
        "ingredient-1",
        { quantity: "0", direction: "decrease", reason: "" },
        tenant,
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mocks.adjustIngredientStock).not.toHaveBeenCalled();
  });

  it("rejects waste that would reduce stock below zero", async () => {
    mocks.adjustIngredientStock.mockResolvedValue({
      ingredient: ingredientRecord,
      insufficient: true,
    });

    await expect(
      adjustIngredientFromPayload(
        "ingredient-1",
        { quantity: "2000", type: "waste", reason: "Spoiled" },
        tenant,
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("returns not found for missing ingredient adjustment targets", async () => {
    mocks.adjustIngredientStock.mockResolvedValue(null);

    await expect(
      adjustIngredientFromPayload(
        "missing",
        { quantity: "1", reason: "Count correction" },
        tenant,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects inventory workflows when the module is disabled", async () => {
    const { ForbiddenError } = await import("@/lib/api-response");
    mocks.requireModuleEnabled.mockRejectedValueOnce(
      new ForbiddenError("Inventory module is disabled."),
    );

    await expect(
      createIngredientFromPayload({ name: "Milk", unit: "ml" }, tenant),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(mocks.createIngredient).not.toHaveBeenCalled();
  });

  it("deletes an unused ingredient inside the active tenant", async () => {
    await deleteIngredientById("ingredient-1", tenant);
    expect(mocks.deleteUnusedIngredient).toHaveBeenCalledWith(tenant, "ingredient-1");
  });

  it("blocks deleting an ingredient that still has stock or references", async () => {
    mocks.deleteUnusedIngredient.mockResolvedValueOnce("in_use");
    await expect(deleteIngredientById("ingredient-1", tenant)).rejects.toThrow(
      "This ingredient has stock, recipe references, or stock history and cannot be deleted.",
    );
  });

  it("returns not found when the ingredient belongs to another tenant", async () => {
    mocks.deleteUnusedIngredient.mockResolvedValueOnce("not_found");
    await expect(deleteIngredientById("foreign-ingredient", tenant)).rejects.toBeInstanceOf(NotFoundError);
  });
});
