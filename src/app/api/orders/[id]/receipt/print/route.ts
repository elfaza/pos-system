import { jsonError, jsonOk, ValidationError } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { getAppSettings } from "@/features/catalog/services/settings-service";
import { getOrder } from "@/features/checkout/services/checkout-service";
import { printReceiptToSystemPrinter } from "@/features/checkout/services/receipt-printer";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["admin", "cashier"]);
    const { id } = await params;
    const [order, settings] = await Promise.all([getOrder(id, user), getAppSettings()]);

    if (order.status !== "paid") {
      throw new ValidationError("Only paid orders can be printed.", {
        status: "Print receipts after payment is complete.",
      });
    }

    if (!settings.receiptPrintingEnabled) {
      throw new ValidationError("Receipt printing is disabled.", {
        receiptPrintingEnabled: "Enable receipt printing in settings.",
      });
    }

    await printReceiptToSystemPrinter(order, settings);

    return jsonOk({ printed: true });
  } catch (error) {
    return jsonError(error);
  }
}
