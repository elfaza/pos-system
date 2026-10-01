import { NextRequest } from "next/server";
import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireTenantContext } from "@/features/auth/services/session-service";
import { requireModuleEnabled } from "@/features/catalog/services/module-config";
import {
  createIngredientFromPayload,
  getIngredientList,
} from "@/features/inventory/services/inventory-service";

export async function GET(request: NextRequest) {
  try {
    const context = await requireTenantContext(["owner", "admin"]);
    await requireModuleEnabled("inventoryEnabled");

    return jsonOk({
      ingredients: await getIngredientList(context, request.nextUrl),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireTenantContext(["owner", "admin"]);
    await requireModuleEnabled("inventoryEnabled");
    const payload = await readJsonObject(request);

    return jsonOk(
      { ingredient: await createIngredientFromPayload(payload, context) },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
