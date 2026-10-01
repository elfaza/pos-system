import { NextRequest } from "next/server";
import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireTenantContext } from "@/features/auth/services/session-service";
import {
  createProductFromPayload,
  getProductListLimit,
  getProductList,
} from "@/features/catalog/services/product-service";

export async function GET(request: NextRequest) {
  try {
    const context = await requireTenantContext(["owner", "admin", "cashier"]);
    const includeUnavailable =
      (context.role === "owner" || context.role === "admin") &&
      request.nextUrl.searchParams.get("includeUnavailable") === "true";

    return jsonOk({
      products: await getProductList(context, request.nextUrl, includeUnavailable),
      limit: getProductListLimit(),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireTenantContext(["owner", "admin"]);
    const payload = await readJsonObject(request);

    return jsonOk(
      { product: await createProductFromPayload(payload, context) },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
