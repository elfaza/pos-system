import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import {
  getHeldOrders,
  holdOrder,
  parseHoldOrderPayload,
} from "@/features/checkout/services/checkout-service";

export async function GET() {
  try {
    const user = await requireUser(["admin", "cashier"]);

    return jsonOk({ orders: await getHeldOrders(user) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["admin", "cashier"]);
    const payload = await readJsonObject(request);
    const input = parseHoldOrderPayload(payload);

    return jsonOk({ order: await holdOrder(input, user) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
