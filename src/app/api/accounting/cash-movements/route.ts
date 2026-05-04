import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import {
  createCashMovementFromPayload,
  getCashMovementList,
} from "@/features/accounting/services/accounting-service";

export async function GET() {
  try {
    await requireUser(["admin"]);
    return jsonOk({ cashMovements: await getCashMovementList() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["admin"]);
    const payload = await readJsonObject(request);
    return jsonOk(
      { cashMovement: await createCashMovementFromPayload(payload, user) },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
