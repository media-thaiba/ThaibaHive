import { PartitionMetadata } from './types';

/**
 * Multi-Tenant Data Lakehouse Partition Path Manager
 */
export class PartitionManager {
  /**
   * Constructs standardized hierarchical partition path
   * e.g., tenant_id=inst-001/domain=students/year=2026/month=08/export_1722684000.parquet
   */
  public static buildPartitionPath(
    tenantId: string,
    domain: string,
    date: Date = new Date(),
    fileName?: string
  ): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const baseDir = `tenant_id=${tenantId}/domain=${domain}/year=${year}/month=${month}`;
    if (fileName) {
      return `${baseDir}/${fileName}`;
    }
    return baseDir;
  }

  /**
   * Parses structured partition path back into metadata components
   */
  public static parsePartitionPath(path: string): Partial<PartitionMetadata> {
    const parts = path.split('/');
    const meta: Partial<PartitionMetadata> = {};

    for (const part of parts) {
      if (part.startsWith('tenant_id=')) {
        meta.tenantId = part.split('=')[1];
      } else if (part.startsWith('domain=')) {
        meta.domain = part.split('=')[1];
      } else if (part.startsWith('year=')) {
        meta.year = parseInt(part.split('=')[1], 10);
      } else if (part.startsWith('month=')) {
        meta.month = parseInt(part.split('=')[1], 10);
      }
    }

    meta.partitionPath = path;
    return meta;
  }
}
