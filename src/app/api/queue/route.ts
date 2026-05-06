import { jsonError, jsonOk } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { requireModuleEnabled } from "@/features/catalog/services/module-config";
import { getQueueDisplay } from "@/features/kitchen/services/kitchen-service";

export async function GET() {
  try {
    await requireUser(["admin", "cashier"]);
    await requireModuleEnabled("queueEnabled");

    return jsonOk({ queue: await getQueueDisplay() });
  } catch (error) {
    return jsonError(error);
  }
}
