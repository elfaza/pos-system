import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireTenantContext } from "@/features/auth/services/session-service";
import { getCurrentOrganization, updateCurrentOrganization } from "@/features/organizations/services/organization-admin-service";

export async function GET() {
  try {
    const context = await requireTenantContext(["owner", "admin"]);
    return jsonOk({ organization: await getCurrentOrganization(context), canEdit: context.role === "owner" });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireTenantContext(["owner"]);
    const payload = await readJsonObject(request);
    return jsonOk({ organization: await updateCurrentOrganization(payload) });
  } catch (error) {
    return jsonError(error);
  }
}
