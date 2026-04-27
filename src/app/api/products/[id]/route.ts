import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { updateProductFromPayload } from "@/features/catalog/services/product-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["admin"]);
    const { id } = await params;
    const payload = await readJsonObject(request);

    return jsonOk({ product: await updateProductFromPayload(id, payload, user) });
  } catch (error) {
    return jsonError(error);
  }
}
