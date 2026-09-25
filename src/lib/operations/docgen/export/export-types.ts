import { ExportFormat, ExportJobType } from '../docgen-types';

export interface ColumnDefinition {
  key: string;
  label: string;
  transform?: 'string' | 'number' | 'currency' | 'date' | 'boolean' | 'uppercase' | 'mask';
  width?: number;
}

export interface ExportDatasetRequest {
  institutionId: string;
  jobType: ExportJobType;
  format: ExportFormat;
  columns?: ColumnDefinition[];
  filterParams?: Record<string, any>;
  data?: Record<string, any>[];
  fileName?: string;
}

export interface ExportStreamResult {
  mimeType: string;
  fileName: string;
  content: string | Buffer;
  recordCount: number;
  fileSizeBytes: number;
}
