import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { requireModuleEnabled } from "@/features/catalog/services/module-config";
import { getAccountingReport } from "@/features/accounting/services/accounting-service";

export async function GET(request: NextRequest) {
  try {
    await requireUser(["admin"]);
    await requireModuleEnabled("accountingEnabled");
    return jsonOk({ report: await getAccountingReport(request.nextUrl) });
  } catch (error) {
    return jsonError(error);
  }
}
