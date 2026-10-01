import { jsonError, jsonOk } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { CUSTOMER_DISPLAY_ACCESS_ROLES } from "@/features/auth/utils/role-routes";
import { getCustomerDisplayMenu } from "@/features/customer-display/services/customer-display-service";

export async function GET() {
  try {
    await requireUser([...CUSTOMER_DISPLAY_ACCESS_ROLES]);
    return jsonOk({ menu: await getCustomerDisplayMenu() });
  } catch (error) {
    return jsonError(error);
  }
}
