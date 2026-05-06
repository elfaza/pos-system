import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { requireModuleEnabled } from "@/features/catalog/services/module-config";
import { getStockMovementList } from "@/features/inventory/services/inventory-service";

export async function GET(request: NextRequest) {
  try {
    await requireUser(["admin"]);
    await requireModuleEnabled("inventoryEnabled");

    return jsonOk({
      movements: await getStockMovementList(request.nextUrl),
    });
  } catch (error) {
    return jsonError(error);
  }
}
