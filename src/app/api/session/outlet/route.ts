import { jsonError, jsonOk, readJsonObject, ValidationError } from "@/lib/api-response";
import { switchCurrentOutlet } from "@/features/auth/services/session-service";

export async function PUT(request: Request) {
  try {
    const payload = await readJsonObject(request);
    if (typeof payload.outletId !== "string" || !payload.outletId.trim()) {
      throw new ValidationError("A valid outletId is required.", { outletId: "Required" });
    }

    const context = await switchCurrentOutlet(payload.outletId.trim());
    return jsonOk({
      activeOrganizationId: context.organizationId,
      activeOutletId: context.outletId,
    });
  } catch (error) {
    return jsonError(error);
  }
}
