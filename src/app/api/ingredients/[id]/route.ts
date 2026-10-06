import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireTenantContext } from "@/features/auth/services/session-service";
import { requireModuleEnabled } from "@/features/catalog/services/module-config";
import {
  deleteIngredientById,
  updateIngredientFromPayload,
} from "@/features/inventory/services/inventory-service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireTenantContext(["owner", "admin"]);
    await requireModuleEnabled("inventoryEnabled");
    const { id } = await params;
    await deleteIngredientById(id, context);
    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireTenantContext(["owner", "admin"]);
    await requireModuleEnabled("inventoryEnabled");
    const payload = await readJsonObject(request);
    const { id } = await params;

    return jsonOk({
      ingredient: await updateIngredientFromPayload(id, payload, context),
    });
  } catch (error) {
    return jsonError(error);
  }
}
