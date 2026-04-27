import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import {
  finalizeCashCheckout,
  parseCashCheckoutPayload,
} from "@/features/checkout/services/checkout-service";

export async function POST(request: Request) {
  try {
    const user = await requireUser(["admin", "cashier"]);
    const payload = await readJsonObject(request);
    const input = parseCashCheckoutPayload(payload);

    return jsonOk({ order: await finalizeCashCheckout(input, user) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
