import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import {
  createTableFromPayload,
  getTables,
} from "@/features/checkout/services/table-service";

export async function GET(request: Request) {
  try {
    await requireUser(["admin", "cashier"]);
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true";

    return jsonOk({ tables: await getTables(includeInactive) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["admin"]);
    const payload = await readJsonObject(request);

    return jsonOk(
      { table: await createTableFromPayload(payload, user) },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
