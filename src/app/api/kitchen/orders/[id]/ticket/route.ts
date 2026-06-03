import { jsonError, jsonOk } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { KITCHEN_ACCESS_ROLES } from "@/features/auth/utils/role-routes";
import { requireModuleEnabled } from "@/features/catalog/services/module-config";
import { getKitchenTicket } from "@/features/kitchen/services/kitchen-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser([...KITCHEN_ACCESS_ROLES]);
    await requireModuleEnabled("kitchenEnabled");
    const { id } = await params;

    return jsonOk({ ticket: await getKitchenTicket(id) });
  } catch (error) {
    return jsonError(error);
  }
}
