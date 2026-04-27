import { jsonError, jsonOk } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import {
  getOrders,
  parseOrderStatusFilter,
} from "@/features/checkout/services/checkout-service";

export async function GET(request: Request) {
  try {
    const user = await requireUser(["admin", "cashier"]);
    const { searchParams } = new URL(request.url);
    const status = parseOrderStatusFilter(searchParams.get("status"));

    return jsonOk({ orders: await getOrders(user, { status }) });
  } catch (error) {
    return jsonError(error);
  }
}
