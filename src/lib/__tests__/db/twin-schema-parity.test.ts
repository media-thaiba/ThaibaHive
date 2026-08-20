import * as sqliteSchema from '../../../../packages/db/schema';
import * as pgSchema from '../../../../packages/db/schema.pg';
import { getTableColumns } from 'drizzle-orm';

describe('Autonomous Campus Digital Twin & Spatial Schema Parity & Table Integrity', () => {
  const twinTableNames = [
    'twinFacilities',
    'twinSpaces',
    'twin3dModels',
    'twinSensors',
    'twinTelemetry',
    'twinAssets',
    'twinGeofences',
    'twinMaintenanceOrders',
    'twinWayfindingNodes',
    'twinWayfindingEdges',
  ];

  it('should export all 10 TWIN tables in both SQLite and PostgreSQL schemas', () => {
    for (const tableName of twinTableNames) {
      expect((sqliteSchema as any)[tableName]).toBeDefined();
      expect((pgSchema as any)[tableName]).toBeDefined();
    }
  });

  it('should verify all TWIN table columns match exactly between dialects', () => {
    for (const tableName of twinTableNames) {
      const sqliteTable = (sqliteSchema as any)[tableName];
      const pgTable = (pgSchema as any)[tableName];

      const sqliteCols = Object.keys(getTableColumns(sqliteTable));
      const pgCols = Object.keys(getTableColumns(pgTable));

      expect(sqliteCols.sort()).toEqual(pgCols.sort());
    }
  });
});
