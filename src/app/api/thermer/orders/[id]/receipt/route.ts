import { jsonError } from "@/lib/api-response";
import { getAppSettings } from "@/features/catalog/services/settings-service";
import { getOrder } from "@/features/checkout/services/checkout-service";
import { buildReceiptThermerPayload } from "@/features/checkout/services/receipt-printer";

function toThermerResponseObject<T>(entries: T[]): Record<string, T> {
  return Object.fromEntries(entries.map((entry, index) => [index.toString(), entry]));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const [order, settings] = await Promise.all([
      getOrder(id, { id: "", role: "admin", email: "", name: "" }),
      getAppSettings(),
    ]);

    return Response.json(toThermerResponseObject(buildReceiptThermerPayload(order, settings)));
  } catch (error) {
    return jsonError(error);
  }
}
