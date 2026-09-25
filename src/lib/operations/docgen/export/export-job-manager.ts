import crypto from 'crypto';
import { DocDbStore } from '../../../db/docgen-store';
import { ExportDatasetRequest, ExportStreamResult } from './export-types';
import { UniversalExportEngine } from './universal-export-engine';
import { ExportJobItem } from '../docgen-types';

export class ExportJobManager {
  private static instance: ExportJobManager;
  private store: DocDbStore;
  private exportEngine: UniversalExportEngine;
  private inMemoryFiles: Map<string, { buffer: Buffer | string; mimeType: string; fileName: string }> = new Map();

  private constructor() {
    this.store = DocDbStore.getInstance();
    this.exportEngine = UniversalExportEngine.getInstance();
  }

  public static getInstance(): ExportJobManager {
    if (!ExportJobManager.instance) {
      ExportJobManager.instance = new ExportJobManager();
    }
    return ExportJobManager.instance;
  }

  public async submitExportJob(
    userId: string,
    request: ExportDatasetRequest
  ): Promise<ExportJobItem> {
    const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const token = crypto.randomBytes(16).toString('hex');
    const totalRecords = request.data?.length || 0;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const jobItem: ExportJobItem = {
      id: jobId,
      institutionId: request.institutionId,
      userId,
      jobType: request.jobType,
      format: request.format,
      filterParamsJson: request.filterParams ? JSON.stringify(request.filterParams) : null,
      selectedColumnsJson: request.columns ? JSON.stringify(request.columns) : null,
      status: 'queued',
      progressPercent: 0,
      totalRecords,
      processedRecords: 0,
      downloadToken: token,
      expiresAt,
      fileSizeBytes: 0,
      createdAt: new Date().toISOString(),
    };

    await this.store.createExportJob(jobItem);

    // Process job asynchronously (synchronous simulation for instant completion)
    this.processJob(jobId, request).catch((err) => {
      console.error(`[ExportJobManager] Error processing job ${jobId}:`, err);
    });

    return jobItem;
  }

  public async processJob(jobId: string, request: ExportDatasetRequest): Promise<void> {
    await this.store.updateExportJobStatus(jobId, { status: 'processing', progressPercent: 25 });

    try {
      const result: ExportStreamResult = await this.exportEngine.exportDataset(request);
      const downloadUrl = `/api/export/download/${jobId}?token=${request.fileName || 'data'}`;

      this.inMemoryFiles.set(jobId, {
        buffer: result.content,
        mimeType: result.mimeType,
        fileName: result.fileName,
      });

      await this.store.updateExportJobStatus(jobId, {
        status: 'completed',
        progressPercent: 100,
        processedRecords: result.recordCount,
        totalRecords: result.recordCount,
        downloadUrl,
        fileSizeBytes: result.fileSizeBytes,
        completedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      await this.store.updateExportJobStatus(jobId, {
        status: 'failed',
        errorMessage: err.message || 'Export generation failed',
      });
    }
  }

  public getExportFile(jobId: string): { buffer: Buffer | string; mimeType: string; fileName: string } | null {
    return this.inMemoryFiles.get(jobId) || null;
  }
}
