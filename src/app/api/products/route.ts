import { NextRequest } from "next/server";
import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import {
  createProductFromPayload,
  getProductListLimit,
  getProductList,
} from "@/features/catalog/services/product-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(["admin", "cashier"]);
    const includeUnavailable =
      user.role === "admin" &&
      request.nextUrl.searchParams.get("includeUnavailable") === "true";

    return jsonOk({
      products: await getProductList(request.nextUrl, includeUnavailable),
      limit: getProductListLimit(),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["admin"]);
    const payload = await readJsonObject(request);

    return jsonOk(
      { product: await createProductFromPayload(payload, user) },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
