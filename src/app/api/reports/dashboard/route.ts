import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { getDashboardReport } from "@/features/reporting/services/reporting-service";

export async function GET(request: NextRequest) {
  try {
    await requireUser(["admin"]);

    return jsonOk({
      report: await getDashboardReport(request.nextUrl),
    });
  } catch (error) {
    return jsonError(error);
  }
}
