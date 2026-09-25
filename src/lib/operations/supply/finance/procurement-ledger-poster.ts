import { DoubleEntryJournalEntry } from './finance-types';

export class ProcurementLedgerPoster {
  private static journalHistory: DoubleEntryJournalEntry[] = [];

  public static postJournalEntry(entry: DoubleEntryJournalEntry): DoubleEntryJournalEntry {
    this.journalHistory.push({ ...entry });
    return entry;
  }

  public static listEntriesByPo(poId: string): DoubleEntryJournalEntry[] {
    return this.journalHistory.filter((e) => e.poId === poId);
  }

  public static clearHistory(): void {
    this.journalHistory = [];
  }
}
