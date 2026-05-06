import { jsonError, jsonOk } from "@/lib/api-response";
import { requireUser } from "@/features/auth/services/session-service";
import { requireModuleEnabled } from "@/features/catalog/services/module-config";
import { getJournalEntryList } from "@/features/accounting/services/accounting-service";

export async function GET() {
  try {
    await requireUser(["admin"]);
    await requireModuleEnabled("accountingEnabled");
    return jsonOk({ journalEntries: await getJournalEntryList() });
  } catch (error) {
    return jsonError(error);
  }
}
