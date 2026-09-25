import * as sqliteSchema from '../../../../packages/db/schema';
import * as pgSchema from '../../../../packages/db/schema.pg';
import { getTableColumns } from 'drizzle-orm';

describe('FACILITY-MIND / SmartCampus OS Schema Parity & Table Integrity (Sprint-052)', () => {
  const facilityTableNames = [
    'facilityEquipment',
    'facilityTelemetrySensors',
    'facilitySensorReadings',
    'facilityPredictiveModels',
    'facilityAnomalyAlerts',
    'facilityWorkOrders',
    'facilityPartsInventory',
    'facilityWorkOrderParts',
    'facilityContractorRegistry',
    'facilityAuditLogs',
  ];

  it('should export all 10 FACILITY-MIND tables in both SQLite and PostgreSQL schemas', () => {
    for (const tableName of facilityTableNames) {
      expect((sqliteSchema as any)[tableName]).toBeDefined();
      expect((pgSchema as any)[tableName]).toBeDefined();
    }
  });

  it('should verify all FACILITY-MIND table columns match exactly between dialects', () => {
    for (const tableName of facilityTableNames) {
      const sqliteTable = (sqliteSchema as any)[tableName];
      const pgTable = (pgSchema as any)[tableName];

      const sqliteCols = Object.keys(getTableColumns(sqliteTable));
      const pgCols = Object.keys(getTableColumns(pgTable));

      expect(sqliteCols.sort()).toEqual(pgCols.sort());
    }
  });
});
