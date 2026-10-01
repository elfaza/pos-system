import { NextRequest } from "next/server";
import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireTenantContext } from "@/features/auth/services/session-service";
import {
  createCategoryFromPayload,
  getCategoryList,
} from "@/features/catalog/services/category-service";

export async function GET(request: NextRequest) {
  try {
    const context = await requireTenantContext(["owner", "admin", "cashier"]);
    const includeInactive =
      (context.role === "owner" || context.role === "admin") &&
      request.nextUrl.searchParams.get("includeInactive") === "true";

    return jsonOk({ categories: await getCategoryList(context, includeInactive) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireTenantContext(["owner", "admin"]);
    const payload = await readJsonObject(request);

    return jsonOk(
      { category: await createCategoryFromPayload(payload, context) },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
