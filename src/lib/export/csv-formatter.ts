import { ExportFormatter, ExportOptions, ExportResult } from "./types";

/**
 * Prepend single quote (') if value starts with formula triggers to prevent CSV formula injection in Excel/Calc
 */
export function sanitizeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  let s = String(val);

  // Formula injection prevention for Excel / LibreOffice
  if (/^[=+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }

  // RFC 4180 quote escaping
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function formatCsvRow(values: unknown[]): string {
  return values.map(sanitizeCsvValue).join(",") + "\n";
}

export class CsvFormatter implements ExportFormatter {
  generate<T = Record<string, unknown>>(options: ExportOptions<T>): ExportResult {
    const { columns, data, type } = options;

    // Prepend UTF-8 Byte Order Mark (\uFEFF) for Excel UTF-8 compatibility
    let csv = "\uFEFF";

    // 1. Header row
    const headers = columns.map((col) => col.header);
    csv += formatCsvRow(headers);

    // 2. Data rows
    for (const row of data) {
      const values = columns.map((col) => {
        const raw = (row as Record<string, unknown>)[col.key];
        if (col.format) {
          return col.format(raw, row);
        }
        return raw;
      });
      csv += formatCsvRow(values);
    }

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `${type}-export-${dateStr}.csv`;

    return {
      content: csv,
      contentType: "text/csv; charset=utf-8",
      filename,
    };
  }
}

export const csvFormatter = new CsvFormatter();
