import * as sqliteSchema from '../../../../packages/db/schema';
import * as pgSchema from '../../../../packages/db/schema.pg';
import { getTableColumns } from 'drizzle-orm';

describe('Autonomous Campus Microgrid & Net-Zero ESG Schema Parity & Table Integrity', () => {
  const ecoTableNames = [
    'ecoEnergyAssets',
    'ecoGenerationSources',
    'ecoStorageBatteries',
    'ecoGridTariffs',
    'ecoTelemetryEnergy',
    'ecoCarbonEmissions',
    'ecoEvChargingStations',
    'ecoEvFleetSessions',
    'ecoEsgReports',
    'ecoCarbonOffsets',
  ];

  it('should export all 10 ECO-MESH tables in both SQLite and PostgreSQL schemas', () => {
    for (const tableName of ecoTableNames) {
      expect((sqliteSchema as any)[tableName]).toBeDefined();
      expect((pgSchema as any)[tableName]).toBeDefined();
    }
  });

  it('should verify all ECO-MESH table columns match exactly between dialects', () => {
    for (const tableName of ecoTableNames) {
      const sqliteTable = (sqliteSchema as any)[tableName];
      const pgTable = (pgSchema as any)[tableName];

      const sqliteCols = Object.keys(getTableColumns(sqliteTable));
      const pgCols = Object.keys(getTableColumns(pgTable));

      expect(sqliteCols.sort()).toEqual(pgCols.sort());
    }
  });
});
