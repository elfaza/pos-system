import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, ValidationError } from "@/lib/api-response";
import {
  adjustIngredientFromPayload,
  createIngredientFromPayload,
  updateIngredientFromPayload,
} from "./inventory-service";

const mocks = vi.hoisted(() => ({
  activityLogCreate: vi.fn(),
  adjustIngredientStock: vi.fn(),
  createIngredient: vi.fn(),
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
  findIngredientById: mocks.findIngredientById,
  listIngredients: mocks.listIngredients,
  listStockMovements: mocks.listStockMovements,
  updateIngredient: mocks.updateIngredient,
}));

vi.mock("@/features/catalog/services/module-config", () => ({
  requireModuleEnabled: mocks.requireModuleEnabled,
}));

const actor = {
  id: "admin-1",
  name: "Admin",
  email: "admin@pos.local",
  role: "admin" as const,
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
      actor,
    );

    expect(mocks.createIngredient).toHaveBeenCalledWith({
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
        actor,
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
      actor,
    );

    expect(mocks.updateIngredient).toHaveBeenCalledWith("ingredient-1", {
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
        actor,
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
        actor,
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("returns not found for missing ingredient adjustment targets", async () => {
    mocks.adjustIngredientStock.mockResolvedValue(null);

    await expect(
      adjustIngredientFromPayload(
        "missing",
        { quantity: "1", reason: "Count correction" },
        actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects inventory workflows when the module is disabled", async () => {
    const { ForbiddenError } = await import("@/lib/api-response");
    mocks.requireModuleEnabled.mockRejectedValueOnce(
      new ForbiddenError("Inventory module is disabled."),
    );

    await expect(
      createIngredientFromPayload({ name: "Milk", unit: "ml" }, actor),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(mocks.createIngredient).not.toHaveBeenCalled();
  });
});
