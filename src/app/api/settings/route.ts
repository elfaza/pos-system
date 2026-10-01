import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireTenantContext } from "@/features/auth/services/session-service";
import {
  getAppSettings,
  updateSettingsFromPayload,
} from "@/features/catalog/services/settings-service";

export async function GET() {
  try {
    const context = await requireTenantContext(["owner", "admin", "cashier"]);
    return jsonOk({ settings: await getAppSettings(context) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireTenantContext(["owner", "admin"]);
    const payload = await readJsonObject(request);

    return jsonOk({ settings: await updateSettingsFromPayload(payload, context) });
  } catch (error) {
    return jsonError(error);
  }
}
