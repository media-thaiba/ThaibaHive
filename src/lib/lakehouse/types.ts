export type CompressionCodec = 'snappy' | 'zstd' | 'none';

export type ParquetDataType = 'string' | 'int32' | 'int64' | 'float64' | 'boolean' | 'timestamp';

export interface ParquetColumnSchema {
  name: string;
  type: ParquetDataType;
  nullable?: boolean;
}

export interface ParquetSchema {
  columns: ParquetColumnSchema[];
}

export interface ParquetWriterOptions {
  compression?: CompressionCodec;
  batchSize?: number;
  maxMemoryMb?: number;
}

export interface ExportJobResult {
  jobId: string;
  tenantId: string;
  domain: string;
  recordCount: number;
  fileSizeBytes: number;
  partitionPath: string;
  durationMs: number;
  completedAt: string;
}

export interface PartitionMetadata {
  tenantId: string;
  domain: string;
  year: number;
  month: number;
  partitionPath: string;
  recordCount: number;
  fileSizeBytes: number;
  lastWatermark: string;
}
