import { jsonError, jsonOk } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { KITCHEN_ACCESS_ROLES } from "@/features/auth/utils/role-routes";
import { requireModuleEnabled } from "@/features/catalog/services/module-config";
import { getKitchenTicket } from "@/features/kitchen/services/kitchen-service";
import { printOrderLabelsToSystemPrinter } from "@/features/kitchen/services/order-label-printer";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser([...KITCHEN_ACCESS_ROLES]);
    await requireModuleEnabled("kitchenEnabled");
    const { id } = await params;
    const ticket = await getKitchenTicket(id);

    await printOrderLabelsToSystemPrinter(ticket);

    return jsonOk({ printed: true });
  } catch (error) {
    return jsonError(error);
  }
}
