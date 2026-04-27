import { NextRequest } from "next/server";
import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import {
  createCategoryFromPayload,
  getCategoryList,
} from "@/features/catalog/services/category-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(["admin", "cashier"]);
    const includeInactive =
      user.role === "admin" && request.nextUrl.searchParams.get("includeInactive") === "true";

    return jsonOk({ categories: await getCategoryList(includeInactive) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["admin"]);
    const payload = await readJsonObject(request);

    return jsonOk(
      { category: await createCategoryFromPayload(payload, user) },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
