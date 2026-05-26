import { jsonError } from "@/lib/api-response";
import { getKitchenTicket } from "@/features/kitchen/services/kitchen-service";
import { buildKitchenTicketThermerPayload } from "@/features/kitchen/services/kitchen-ticket-printer";

function toThermerResponseObject<T>(entries: T[]): Record<string, T> {
  return Object.fromEntries(entries.map((entry, index) => [index.toString(), entry]));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ticket = await getKitchenTicket(id);

    return Response.json(toThermerResponseObject(buildKitchenTicketThermerPayload(ticket)));
  } catch (error) {
    return jsonError(error);
  }
}
