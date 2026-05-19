import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import {
  finalizeCheckout,
  parseCheckoutPayload,
} from "@/features/checkout/services/checkout-service";

export async function POST(request: Request) {
  try {
    const user = await requireUser(["admin", "cashier"]);
    const payload = await readJsonObject(request);
    const input = parseCheckoutPayload(payload);

    return jsonOk({ order: await finalizeCheckout(input, user) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
