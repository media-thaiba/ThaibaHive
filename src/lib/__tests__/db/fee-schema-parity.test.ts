import * as sqliteSchema from '../../../../packages/db/schema';
import * as pgSchema from '../../../../packages/db/schema.pg';
import { getTableColumns } from 'drizzle-orm';

describe('FEE-HIVE / FinanceOS Schema Parity & Table Integrity (Sprint-057 - FEE-001)', () => {
  const feeTableNames = [
    'feeStructures',
    'feeStructureComponents',
    'feeStudentAllocations',
    'feeInstallments',
    'feePayments',
    'feePaymentTransactions',
    'feeReceipts',
    'feeScholarships',
    'feeConcessions',
    'feeCounterRegisters',
    'feeDefaulterLogs',
    'feeReconciliationBatches',
    'feeAuditLogs',
  ];

  it('should export all 13 FEE-HIVE tables in both SQLite and PostgreSQL schemas', () => {
    for (const tableName of feeTableNames) {
      expect((sqliteSchema as any)[tableName]).toBeDefined();
      expect((pgSchema as any)[tableName]).toBeDefined();
    }
  });

  it('should verify all FEE-HIVE table columns match exactly between SQLite and PostgreSQL dialects', () => {
    for (const tableName of feeTableNames) {
      const sqliteTable = (sqliteSchema as any)[tableName];
      const pgTable = (pgSchema as any)[tableName];

      const sqliteCols = Object.keys(getTableColumns(sqliteTable));
      const pgCols = Object.keys(getTableColumns(pgTable));

      expect(sqliteCols.sort()).toEqual(pgCols.sort());
    }
  });
});
