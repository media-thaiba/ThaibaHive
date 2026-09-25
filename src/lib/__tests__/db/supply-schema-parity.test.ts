import * as sqliteSchema from '../../../../packages/db/schema';
import * as pgSchema from '../../../../packages/db/schema.pg';
import { getTableColumns } from 'drizzle-orm';

describe('SUPPLY-HIVE / ProcurementOS Schema Parity & Table Integrity (Sprint-054)', () => {
  const supplyTableNames = [
    'supplyVendors',
    'supplyVendorCertifications',
    'supplyVendorRiskAssessments',
    'supplyVendorEsgScores',
    'supplyPurchaseRequisitions',
    'supplyPurchaseOrders',
    'supplyPoLineItems',
    'supplyGoodsReceipts',
    'supplyVendorInvoices',
    'supplyThreeWayMatches',
    'supplyContracts',
    'supplyContractMilestones',
    'supplyBudgetEncumbrances',
    'supplyAuditLogs',
  ];

  it('should export all 14 SUPPLY-HIVE tables in both SQLite and PostgreSQL schemas', () => {
    for (const tableName of supplyTableNames) {
      expect((sqliteSchema as any)[tableName]).toBeDefined();
      expect((pgSchema as any)[tableName]).toBeDefined();
    }
  });

  it('should verify all SUPPLY-HIVE table columns match exactly between dialects', () => {
    for (const tableName of supplyTableNames) {
      const sqliteTable = (sqliteSchema as any)[tableName];
      const pgTable = (pgSchema as any)[tableName];

      const sqliteCols = Object.keys(getTableColumns(sqliteTable));
      const pgCols = Object.keys(getTableColumns(pgTable));

      expect(sqliteCols.sort()).toEqual(pgCols.sort());
    }
  });
});
