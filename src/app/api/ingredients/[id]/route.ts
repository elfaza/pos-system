import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { updateIngredientFromPayload } from "@/features/inventory/services/inventory-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["admin"]);
    const payload = await readJsonObject(request);
    const { id } = await params;

    return jsonOk({
      ingredient: await updateIngredientFromPayload(id, payload, user),
    });
  } catch (error) {
    return jsonError(error);
  }
}
