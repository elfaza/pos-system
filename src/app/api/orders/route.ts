import { jsonError, jsonOk } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import {
  getOrders,
  parseOrderStatusFilter,
  parsePaymentDateFilter,
  parsePaymentMethodFilter,
  parsePaymentStatusFilter,
} from "@/features/checkout/services/checkout-service";

export async function GET(request: Request) {
  try {
    const user = await requireUser(["admin", "cashier"]);
    const { searchParams } = new URL(request.url);
    const status = parseOrderStatusFilter(searchParams.get("status"));
    const paymentMethod = parsePaymentMethodFilter(searchParams.get("paymentMethod"));
    const paymentStatus = parsePaymentStatusFilter(searchParams.get("paymentStatus"));
    const paidFrom = parsePaymentDateFilter(searchParams.get("paidFrom"), "paidFrom");
    const paidTo = parsePaymentDateFilter(searchParams.get("paidTo"), "paidTo");

    return jsonOk({
      orders: await getOrders(user, {
        status,
        paymentMethod,
        paymentStatus,
        paidFrom,
        paidTo,
      }),
    });
  } catch (error) {
    return jsonError(error);
  }
}
