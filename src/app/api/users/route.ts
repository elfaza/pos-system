import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import {
  createUserFromPayload,
  getUserList,
} from "@/features/auth/services/user-service";

export async function GET() {
  try {
    await requireUser(["admin"]);

    return jsonOk({ users: await getUserList() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["admin"]);
    const payload = await readJsonObject(request);

    return jsonOk(
      { user: await createUserFromPayload(payload, user) },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
