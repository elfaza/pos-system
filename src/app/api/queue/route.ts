import { jsonError, jsonOk } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { getQueueDisplay } from "@/features/kitchen/services/kitchen-service";

export async function GET() {
  try {
    await requireUser(["admin", "cashier"]);

    return jsonOk({ queue: await getQueueDisplay() });
  } catch (error) {
    return jsonError(error);
  }
}
