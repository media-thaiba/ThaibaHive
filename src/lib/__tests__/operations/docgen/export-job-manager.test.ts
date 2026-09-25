import { ExportJobManager } from '../../../operations/docgen/export/export-job-manager';
import { DocDbStore } from '../../../db/docgen-store';

describe('ExportJobManager Background Queue (Sprint-056)', () => {
  beforeEach(() => {
    DocDbStore.getInstance().clearMemoryStore();
  });

  it('should submit an export job and transition to completed status', async () => {
    const manager = ExportJobManager.getInstance();
    const job = await manager.submitExportJob('user-123', {
      institutionId: 'inst-001',
      jobType: 'students',
      format: 'csv',
      data: [{ rollNumber: 'R1', name: 'Student One', className: 'CS1' }],
    });

    expect(job.id).toBeDefined();
    expect(job.downloadToken).toBeDefined();
    expect(job.status).toBe('queued');

    // Wait a brief tick for async processJob execution
    await new Promise((r) => setTimeout(r, 50));

    const updatedJob = await DocDbStore.getInstance().getExportJobById(job.id, 'inst-001');
    expect(updatedJob?.status).toBe('completed');
    expect(updatedJob?.progressPercent).toBe(100);
    expect(updatedJob?.downloadUrl).toBeDefined();

    const file = manager.getExportFile(job.id);
    expect(file).toBeDefined();
    expect(file?.mimeType).toContain('text/csv');
  });
});
