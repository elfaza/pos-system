import { jsonError, jsonOk } from "@/lib/api-response";
import { requireTenantContext } from "@/features/auth/services/session-service";
import {
  CUSTOMER_DISPLAY_ACCESS_ROLES,
  CUSTOMER_DISPLAY_WRITE_ROLES,
} from "@/features/auth/utils/role-routes";
import {
  getCustomerDisplay,
  updateCustomerDisplayFromPayload,
} from "@/features/customer-display/services/customer-display-service";

export async function GET() {
  try {
    const context = await requireTenantContext([...CUSTOMER_DISPLAY_ACCESS_ROLES]);
    return jsonOk({ display: await getCustomerDisplay(context) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const context = await requireTenantContext([...CUSTOMER_DISPLAY_WRITE_ROLES]);
    const payload = (await request.json()) as Record<string, unknown>;
    return jsonOk({ display: await updateCustomerDisplayFromPayload(payload, context) });
  } catch (error) {
    return jsonError(error);
  }
}
