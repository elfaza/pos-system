import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, ValidationError } from "@/lib/api-response";
import { DELETE } from "./route";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), deleteIngredientById: vi.fn() }));
vi.mock("@/features/auth/services/session-service", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/features/catalog/services/module-config", () => ({ requireModuleEnabled: vi.fn() }));
vi.mock("@/features/inventory/services/inventory-service", () => ({
  deleteIngredientById: mocks.deleteIngredientById, updateIngredientFromPayload: vi.fn(),
}));

describe("DELETE ingredient", () => {
  const actor = { id: "admin-1", role: "admin" };
  const request = new Request("https://pos.local/api/ingredients/ingredient-1", { method: "DELETE" });
  const context = { params: Promise.resolve({ id: "ingredient-1" }) };

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireUser.mockResolvedValue(actor);
  });

  it("requires admin access and deletes the requested ingredient", async () => {
    const response = await DELETE(request, context);
    expect(mocks.requireUser).toHaveBeenCalledWith(["admin"]);
    expect(mocks.deleteIngredientById).toHaveBeenCalledWith("ingredient-1", actor);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true });
  });

  it("does not call deletion when access is denied", async () => {
    mocks.requireUser.mockRejectedValueOnce(new ForbiddenError());
    expect((await DELETE(request, context)).status).toBe(403);
    expect(mocks.deleteIngredientById).not.toHaveBeenCalled();
  });

  it("returns the explanation for an ingredient still in use", async () => {
    mocks.deleteIngredientById.mockRejectedValueOnce(new ValidationError("Ingredient is still in use."));
    const response = await DELETE(request, context);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "Ingredient is still in use." });
  });
});
