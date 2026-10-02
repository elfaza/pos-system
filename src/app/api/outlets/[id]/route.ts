import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireTenantContext } from "@/features/auth/services/session-service";
import { updateOrganizationOutlet } from "@/features/organizations/services/organization-admin-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireTenantContext(["owner", "admin"]);
    const { id } = await params;
    const payload = await readJsonObject(request);
    return jsonOk({ outlet: await updateOrganizationOutlet(id, payload) });
  } catch (error) {
    return jsonError(error);
  }
}
