import * as sqliteSchema from '../../../../packages/db/schema';
import * as pgSchema from '../../../../packages/db/schema.pg';
import { getTableColumns } from 'drizzle-orm';

describe('DOC-GEN / ExportHub Schema Parity & Table Integrity (Sprint-056)', () => {
  const docgenTableNames = [
    'docTemplates',
    'docGeneratedRecords',
    'docVerificationSignatures',
    'exportJobs',
    'exportTemplates',
    'mobileSyncEvents',
    'mobileDeviceTokens',
    'mobilePushLogs',
    'docAuditLogs',
  ];

  it('should export all 9 DOC-GEN / ExportHub tables in both SQLite and PostgreSQL schemas', () => {
    for (const tableName of docgenTableNames) {
      expect((sqliteSchema as any)[tableName]).toBeDefined();
      expect((pgSchema as any)[tableName]).toBeDefined();
    }
  });

  it('should verify all DOC-GEN / ExportHub table columns match exactly between dialects', () => {
    for (const tableName of docgenTableNames) {
      const sqliteTable = (sqliteSchema as any)[tableName];
      const pgTable = (pgSchema as any)[tableName];

      const sqliteCols = Object.keys(getTableColumns(sqliteTable));
      const pgCols = Object.keys(getTableColumns(pgTable));

      expect(sqliteCols.sort()).toEqual(pgCols.sort());
    }
  });
});
