export interface BankStatementLine {
  lineNumber: number;
  transactionDate: string;
  valueDate: string;
  referenceNumber: string; // UTR / Txn ID / Cheque #
  amount: number;
  entryType: 'CR' | 'DR';
  description: string;
  closingBalance?: number;
}

export class StatementParser {
  /**
   * Parses CSV formatted bank statements
   * Expects headers like: Date, Value Date, Reference, Amount, Type (CR/DR), Description
   */
  public static parseCsv(csvContent: string): BankStatementLine[] {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return [];

    const headers = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/["']/g, ''));
    const records: BankStatementLine[] = [];

    const dateIdx = headers.findIndex((h) => h.includes('date'));
    const refIdx = headers.findIndex((h) => h.includes('ref') || h.includes('utr') || h.includes('txn') || h.includes('cheque'));
    const amtIdx = headers.findIndex((h) => h.includes('amount') || h.includes('credit') || h.includes('debit'));
    const typeIdx = headers.findIndex((h) => h.includes('type') || h.includes('cr/dr'));
    const descIdx = headers.findIndex((h) => h.includes('desc') || h.includes('narration') || h.includes('particular'));

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/["']/g, ''));
      if (cols.length < 3) continue;

      const date = cols[dateIdx >= 0 ? dateIdx : 0] || new Date().toISOString().split('T')[0];
      const ref = cols[refIdx >= 0 ? refIdx : 1] || `TXN${Date.now()}_${i}`;
      const rawAmt = parseFloat(cols[amtIdx >= 0 ? amtIdx : 2]?.replace(/[^0-9.-]/g, '') || '0');
      const amount = Math.abs(rawAmt);
      let entryType: 'CR' | 'DR' = 'CR';

      if (typeIdx >= 0 && cols[typeIdx]) {
        entryType = cols[typeIdx].toUpperCase().includes('DR') ? 'DR' : 'CR';
      } else if (rawAmt < 0) {
        entryType = 'DR';
      }

      const desc = descIdx >= 0 ? cols[descIdx] : cols.slice(3).join(' ');

      records.push({
        lineNumber: i,
        transactionDate: date,
        valueDate: date,
        referenceNumber: ref,
        amount,
        entryType,
        description: desc || 'Bank Transfer',
      });
    }

    return records;
  }

  /**
   * Generates a sample bank statement CSV string for testing/simulation
   */
  public static generateSampleCsv(
    entries: Array<{ date: string; ref: string; amount: number; desc: string; type?: 'CR' | 'DR' }>
  ): string {
    const header = 'Date,Reference,Amount,Type,Description\n';
    const rows = entries
      .map((e) => `${e.date},"${e.ref}",${e.amount},${e.type || 'CR'},"${e.desc}"`)
      .join('\n');
    return header + rows;
  }
}
