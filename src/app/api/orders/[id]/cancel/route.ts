import { jsonError, jsonOk } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { cancelOrder } from "@/features/checkout/services/checkout-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["admin", "cashier"]);
    const { id } = await params;

    return jsonOk({ order: await cancelOrder(id, user) });
  } catch (error) {
    return jsonError(error);
  }
}
