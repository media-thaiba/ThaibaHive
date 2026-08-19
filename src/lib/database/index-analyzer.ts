import crypto from 'crypto';
import { IndexRecommendation, RiskLevel } from './types';

export interface TableScanStats {
  tableName: string;
  seqScans: number;
  idxScans: number;
  totalRows: number;
}

export class IndexAnalyzer {
  /**
   * Analyzes table scan statistics and generates index creation recommendations
   */
  public analyzeTableStats(statsList: TableScanStats[]): IndexRecommendation[] {
    const recommendations: IndexRecommendation[] = [];

    for (const stats of statsList) {
      if (stats.seqScans > 100 && stats.seqScans > stats.idxScans * 2) {
        const recommendedIndexName = `idx_autotune_${stats.tableName}_inst_date`;
        const indexDdl = `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${recommendedIndexName} ON ${stats.tableName} (institution_id, created_at);`;

        let riskLevel: RiskLevel = 'LOW';
        if (stats.totalRows > 1000000) {
          riskLevel = 'HIGH';
        } else if (stats.totalRows > 100000) {
          riskLevel = 'MEDIUM';
        }

        recommendations.push({
          id: `rec_${crypto.randomUUID()}`,
          tableName: stats.tableName,
          recommendedIndexName,
          indexDdl,
          seqScans: stats.seqScans,
          estTimeSavingsMs: Math.round(stats.seqScans * 1.5),
          riskLevel,
          status: 'RECOMMENDED',
          createdAt: new Date().toISOString(),
        });
      }
    }

    return recommendations;
  }
}
