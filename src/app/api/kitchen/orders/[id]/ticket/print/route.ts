import { jsonError, jsonOk } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { requireModuleEnabled } from "@/features/catalog/services/module-config";
import { getKitchenTicket } from "@/features/kitchen/services/kitchen-service";
import { printKitchenTicketToSystemPrinter } from "@/features/kitchen/services/kitchen-ticket-printer";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    await requireModuleEnabled("kitchenEnabled");
    const { id } = await params;
    const ticket = await getKitchenTicket(id);

    await printKitchenTicketToSystemPrinter(ticket);

    return jsonOk({ printed: true });
  } catch (error) {
    return jsonError(error);
  }
}
