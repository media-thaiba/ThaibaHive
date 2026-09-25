import * as sqliteSchema from '../../../../packages/db/schema';
import * as pgSchema from '../../../../packages/db/schema.pg';
import { getTableColumns } from 'drizzle-orm';

describe('NEURO-CLUSTER / ResearchCompute OS Schema Parity & Table Integrity (Sprint-053)', () => {
  const neuroTableNames = [
    'neuroClusters',
    'neuroNodes',
    'neuroGpus',
    'neuroJobs',
    'neuroJobCheckpoints',
    'neuroFairShareQuotas',
    'neuroCloudProviders',
    'neuroSpotPriceHistory',
    'neuroDatasetProvenance',
    'neuroMerkleLineageNodes',
    'neuroComputeBillingAccounts',
    'neuroGrantCreditAllocations',
    'neuroBillingLedgerTransactions',
    'neuroAuditLogs',
  ];

  it('should export all 14 NEURO-CLUSTER tables in both SQLite and PostgreSQL schemas', () => {
    for (const tableName of neuroTableNames) {
      expect((sqliteSchema as any)[tableName]).toBeDefined();
      expect((pgSchema as any)[tableName]).toBeDefined();
    }
  });

  it('should verify all NEURO-CLUSTER table columns match exactly between dialects', () => {
    for (const tableName of neuroTableNames) {
      const sqliteTable = (sqliteSchema as any)[tableName];
      const pgTable = (pgSchema as any)[tableName];

      const sqliteCols = Object.keys(getTableColumns(sqliteTable));
      const pgCols = Object.keys(getTableColumns(pgTable));

      expect(sqliteCols.sort()).toEqual(pgCols.sort());
    }
  });
});
