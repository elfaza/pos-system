import { jsonError, jsonOk } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { getJournalEntryList } from "@/features/accounting/services/accounting-service";

export async function GET() {
  try {
    await requireUser(["admin"]);
    return jsonOk({ journalEntries: await getJournalEntryList() });
  } catch (error) {
    return jsonError(error);
  }
}
