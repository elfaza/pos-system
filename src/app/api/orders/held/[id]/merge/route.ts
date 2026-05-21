import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { mergeHeldDineInOrders } from "@/features/checkout/services/checkout-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["admin", "cashier"]);
    const { id } = await params;
    const payload = await readJsonObject(request);

    return jsonOk({ order: await mergeHeldDineInOrders(id, payload, user) });
  } catch (error) {
    return jsonError(error);
  }
}
