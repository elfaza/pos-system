import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import {
  createAccountFromPayload,
  getAccountsAndCategories,
} from "@/features/accounting/services/accounting-service";

export async function GET() {
  try {
    await requireUser(["admin"]);
    return jsonOk(await getAccountsAndCategories());
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser(["admin"]);
    const payload = await readJsonObject(request);
    return jsonOk({ account: await createAccountFromPayload(payload) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
