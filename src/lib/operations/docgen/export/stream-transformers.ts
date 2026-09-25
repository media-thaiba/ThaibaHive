import { ColumnDefinition } from './export-types';
import { resolvePath } from '../templates/token-evaluator';

export class StreamTransformers {
  public static transformValue(val: any, transformType?: ColumnDefinition['transform']): string {
    if (val === null || val === undefined) return '';

    switch (transformType) {
      case 'date':
        try {
          const d = new Date(val);
          return isNaN(d.getTime()) ? String(val) : d.toISOString().split('T')[0];
        } catch {
          return String(val);
        }
      case 'currency':
        return Number(val || 0).toFixed(2);
      case 'boolean':
        return val ? 'YES' : 'NO';
      case 'uppercase':
        return String(val).toUpperCase();
      case 'mask':
        const s = String(val);
        return s.length > 4 ? s.slice(0, 2) + '****' + s.slice(-2) : '****';
      case 'number':
        return String(Number(val) || 0);
      case 'string':
      default:
        return String(val);
    }
  }

  public static toCsv(rows: Record<string, any>[], columns: ColumnDefinition[]): string {
    const headers = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(',');
    const dataLines = rows.map((row) => {
      return columns
        .map((col) => {
          const rawVal = resolvePath(row, col.key);
          const transformed = this.transformValue(rawVal, col.transform);
          return `"${String(transformed).replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    return [headers, ...dataLines].join('\r\n');
  }

  public static toJson(rows: Record<string, any>[], columns: ColumnDefinition[]): string {
    const mapped = rows.map((row) => {
      const out: Record<string, any> = {};
      for (const col of columns) {
        const rawVal = resolvePath(row, col.key);
        out[col.label || col.key] = this.transformValue(rawVal, col.transform);
      }
      return out;
    });
    return JSON.stringify(mapped, null, 2);
  }

  public static toTabularHtml(rows: Record<string, any>[], columns: ColumnDefinition[], title = 'Data Export'): string {
    const headerHtml = columns.map((c) => `<th>${c.label}</th>`).join('');
    const rowsHtml = rows
      .map((row) => {
        const cells = columns
          .map((c) => {
            const raw = resolvePath(row, c.key);
            const val = this.transformValue(raw, c.transform);
            return `<td>${val}</td>`;
          })
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; font-size: 12px; }
    h2 { color: #0f172a; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #0f172a; color: white; text-align: left; padding: 8px; font-size: 11px; }
    td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; }
    tr:nth-child(even) { background: #f8fafc; }
  </style>
</head>
<body>
  <h2>${title}</h2>
  <div style="font-size: 11px; color: #64748b; margin-bottom: 10px;">Generated: ${new Date().toISOString()} | Records: ${rows.length}</div>
  <table>
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>
    `.trim();
  }
}
