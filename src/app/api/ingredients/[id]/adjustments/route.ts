import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireTenantContext } from "@/features/auth/services/session-service";
import { requireModuleEnabled } from "@/features/catalog/services/module-config";
import { adjustIngredientFromPayload } from "@/features/inventory/services/inventory-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireTenantContext(["owner", "admin"]);
    await requireModuleEnabled("inventoryEnabled");
    const payload = await readJsonObject(request);
    const { id } = await params;

    return jsonOk({
      ingredient: await adjustIngredientFromPayload(id, payload, context),
    });
  } catch (error) {
    return jsonError(error);
  }
}
