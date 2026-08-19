export type ExportType =
  | "attendance"
  | "leaves"
  | "staff"
  | "payroll"
  | "accounts"
  | "assets"
  | "expenses"
  | "tabulation"
  | "examinations"
  | "fleet"
  | "canteen"
  | "visitors"
  | "performance"
  | "ai_insights"
  | "regional_analytics";

export type ExportFormat = "csv" | "xlsx" | "pdf";

export interface ExportColumn<T = Record<string, unknown>> {
  key: keyof T & string;
  header: string;
  width?: number;
  align?: "left" | "center" | "right";
  format?: (value: unknown, row: T) => string;
}

export interface ExportOptions<T = Record<string, unknown>> {
  type: ExportType;
  format: ExportFormat;
  title: string;
  columns: ExportColumn<T>[];
  data: T[];
  institutionName?: string;
  dateFrom?: string;
  dateTo?: string;
  generatedBy?: string;
  metadata?: Record<string, string | number | undefined>;
}

export interface ExportResult {
  content: Buffer | string;
  contentType: string;
  filename: string;
}

export interface ExportFormatter {
  generate<T = Record<string, unknown>>(options: ExportOptions<T>): Promise<ExportResult> | ExportResult;
}
