import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
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
    const user = await requireUser(["admin"]);
    const { id } = await params;
    await deleteIngredientById(id, user);
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
    const user = await requireUser(["admin"]);
    await requireModuleEnabled("inventoryEnabled");
    const payload = await readJsonObject(request);
    const { id } = await params;

    return jsonOk({
      ingredient: await updateIngredientFromPayload(id, payload, user),
    });
  } catch (error) {
    return jsonError(error);
  }
}
