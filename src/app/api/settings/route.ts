import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import {
  getAppSettings,
  updateSettingsFromPayload,
} from "@/features/catalog/services/settings-service";

export async function GET() {
  try {
    await requireUser(["admin", "cashier"]);
    return jsonOk({ settings: await getAppSettings() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser(["admin"]);
    const payload = await readJsonObject(request);

    return jsonOk({ settings: await updateSettingsFromPayload(payload, user) });
  } catch (error) {
    return jsonError(error);
  }
}
