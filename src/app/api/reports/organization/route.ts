import { jsonError, jsonOk } from "@/lib/api-response";
import { getOrganizationSalesSummary } from "@/features/reporting/services/reporting-service";

export async function GET(request: Request) {
  try {
    return jsonOk({ report: await getOrganizationSalesSummary(new URL(request.url)) });
  } catch (error) {
    return jsonError(error);
  }
}
