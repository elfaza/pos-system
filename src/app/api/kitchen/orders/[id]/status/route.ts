import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import {
  changeKitchenStatus,
  parseKitchenStatus,
} from "@/features/kitchen/services/kitchen-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["admin", "cashier"]);
    const { id } = await params;
    const payload = await readJsonObject(request);
    const status = parseKitchenStatus(payload.status);

    return jsonOk({ order: await changeKitchenStatus(id, status, user) });
  } catch (error) {
    return jsonError(error);
  }
}
