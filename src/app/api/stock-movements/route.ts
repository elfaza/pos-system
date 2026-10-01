import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-response";
import { requireTenantContext } from "@/features/auth/services/session-service";
import { requireModuleEnabled } from "@/features/catalog/services/module-config";
import { getStockMovementList } from "@/features/inventory/services/inventory-service";

export async function GET(request: NextRequest) {
  try {
    const context = await requireTenantContext(["owner", "admin"]);
    await requireModuleEnabled("inventoryEnabled");

    return jsonOk({
      movements: await getStockMovementList(context, request.nextUrl),
    });
  } catch (error) {
    return jsonError(error);
  }
}
