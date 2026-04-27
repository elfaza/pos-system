import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { updateUserFromPayload } from "@/features/auth/services/user-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(["admin"]);
    const { id } = await params;
    const payload = await readJsonObject(request);

    return jsonOk({ user: await updateUserFromPayload(id, payload, user) });
  } catch (error) {
    return jsonError(error);
  }
}
