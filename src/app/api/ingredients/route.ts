import { NextRequest } from "next/server";
import { jsonError, jsonOk, readJsonObject } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import {
  createIngredientFromPayload,
  getIngredientList,
} from "@/features/inventory/services/inventory-service";

export async function GET(request: NextRequest) {
  try {
    await requireUser(["admin"]);

    return jsonOk({
      ingredients: await getIngredientList(request.nextUrl),
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
      { ingredient: await createIngredientFromPayload(payload, user) },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
