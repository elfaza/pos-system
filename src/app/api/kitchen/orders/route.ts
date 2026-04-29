import { jsonError, jsonOk } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { getKitchenBoard } from "@/features/kitchen/services/kitchen-service";

export async function GET() {
  try {
    await requireUser(["admin", "cashier"]);

    return jsonOk({ board: await getKitchenBoard() });
  } catch (error) {
    return jsonError(error);
  }
}
