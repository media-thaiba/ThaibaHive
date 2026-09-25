import * as sqliteSchema from '../../../../packages/db/schema';
import * as pgSchema from '../../../../packages/db/schema.pg';
import { getTableColumns } from 'drizzle-orm';

describe('Autonomous Campus Safety & AI Vision Shield Schema Parity & Table Integrity', () => {
  const visionTableNames = [
    'visionCameras',
    'visionDetectionZones',
    'visionThreatAlerts',
    'visionSecurityIncidents',
    'visionGuardProfiles',
    'visionGuardDispatches',
    'visionAlprLogs',
    'visionVehicleWhitelist',
    'visionLockdownEvents',
    'visionPrivacyAuditLogs',
  ];

  it('should export all 10 VISION-SHIELD tables in both SQLite and PostgreSQL schemas', () => {
    for (const tableName of visionTableNames) {
      expect((sqliteSchema as any)[tableName]).toBeDefined();
      expect((pgSchema as any)[tableName]).toBeDefined();
    }
  });

  it('should verify all VISION-SHIELD table columns match exactly between dialects', () => {
    for (const tableName of visionTableNames) {
      const sqliteTable = (sqliteSchema as any)[tableName];
      const pgTable = (pgSchema as any)[tableName];

      const sqliteCols = Object.keys(getTableColumns(sqliteTable));
      const pgCols = Object.keys(getTableColumns(pgTable));

      expect(sqliteCols.sort()).toEqual(pgCols.sort());
    }
  });
});
