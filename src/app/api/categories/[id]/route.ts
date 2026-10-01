import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireTenantContext } from "@/features/auth/services/session-service";
import { updateCategoryFromPayload } from "@/features/catalog/services/category-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireTenantContext(["owner", "admin"]);
    const { id } = await params;
    const payload = await readJsonObject(request);

    return jsonOk({ category: await updateCategoryFromPayload(id, payload, context) });
  } catch (error) {
    return jsonError(error);
  }
}
