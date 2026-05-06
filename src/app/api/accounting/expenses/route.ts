import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { requireModuleEnabled } from "@/features/catalog/services/module-config";
import {
  createExpenseFromPayload,
  getExpenseList,
} from "@/features/accounting/services/accounting-service";

export async function GET() {
  try {
    await requireUser(["admin"]);
    await requireModuleEnabled("accountingEnabled");
    return jsonOk({ expenses: await getExpenseList() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["admin"]);
    await requireModuleEnabled("accountingEnabled");
    const payload = await readJsonObject(request);
    return jsonOk(
      { expense: await createExpenseFromPayload(payload, user) },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
