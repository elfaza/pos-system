import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireTenantContext } from "@/features/auth/services/session-service";
import { createOrganizationOutlet, listOrganizationOutlets } from "@/features/organizations/services/organization-admin-service";

export async function GET() {
  try {
    const context = await requireTenantContext(["owner", "admin"]);
    return jsonOk({
      outlets: await listOrganizationOutlets(context),
      canCreate: context.role === "owner",
      canManageOutletStructure: context.role === "owner",
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireTenantContext(["owner"]);
    const payload = await readJsonObject(request);
    return jsonOk({ outlet: await createOrganizationOutlet(payload) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
