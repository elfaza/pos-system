import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { requireModuleEnabled } from "@/features/catalog/services/module-config";
import {
  createDailyCloseFromPayload,
  getDailyCloseList,
} from "@/features/accounting/services/accounting-service";

export async function GET() {
  try {
    await requireUser(["admin"]);
    await requireModuleEnabled("accountingEnabled");
    return jsonOk({ dailyCloses: await getDailyCloseList() });
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
      { dailyClose: await createDailyCloseFromPayload(payload, user) },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
