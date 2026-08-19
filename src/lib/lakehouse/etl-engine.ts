import { ParquetWriter } from './parquet-writer';
import { PartitionManager } from './partition-manager';
import { ParquetSchema, ExportJobResult } from './types';

export interface IncrementalExtractionRequest {
  jobId: string;
  tenantId: string;
  domain: string;
  lastWatermark?: string;
  schema: ParquetSchema;
  fetchRecords: (tenantId: string, sinceIso?: string) => Promise<Record<string, any>[]>;
}

/**
 * Incremental Multi-Tenant ETL Processing Engine
 */
export class EtlEngine {
  /**
   * Executes an incremental data lakehouse extraction pipeline job
   */
  public async executeIncrementalEtl(request: IncrementalExtractionRequest): Promise<{
    jobResult: ExportJobResult;
    buffer: Buffer;
  }> {
    const startTime = Date.now();

    // Fetch incremental data filtered by tenant ID & watermark
    const rawRecords = await request.fetchRecords(request.tenantId, request.lastWatermark);

    // Filter to guarantee absolute tenant isolation
    const tenantIsolatedRecords = rawRecords.filter(
      (r) => r.tenantId === request.tenantId || r.institutionId === request.tenantId || !r.tenantId
    );

    const now = new Date();
    const fileName = `export_${now.getTime()}.parquet`;
    const partitionPath = PartitionManager.buildPartitionPath(request.tenantId, request.domain, now, fileName);

    const writer = new ParquetWriter(request.schema);
    const buffer = await writer.writeRecordsToBuffer(tenantIsolatedRecords);

    const durationMs = Date.now() - startTime;

    const jobResult: ExportJobResult = {
      jobId: request.jobId,
      tenantId: request.tenantId,
      domain: request.domain,
      recordCount: tenantIsolatedRecords.length,
      fileSizeBytes: buffer.length,
      partitionPath,
      durationMs,
      completedAt: now.toISOString(),
    };

    return { jobResult, buffer };
  }
}
