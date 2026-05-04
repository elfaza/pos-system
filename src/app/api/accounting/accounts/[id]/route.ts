import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { updateAccountFromPayload } from "@/features/accounting/services/accounting-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(["admin"]);
    const { id } = await params;
    const payload = await readJsonObject(request);
    return jsonOk({ account: await updateAccountFromPayload(id, payload) });
  } catch (error) {
    return jsonError(error);
  }
}
