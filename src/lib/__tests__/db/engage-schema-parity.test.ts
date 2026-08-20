import * as sqliteSchema from '../../../../packages/db/schema';
import * as pgSchema from '../../../../packages/db/schema.pg';
import { getTableColumns } from 'drizzle-orm';

describe('EngageOS Schema Parity & Table Integrity', () => {
  const engageTableNames = [
    'engageTemplates',
    'engageMessages',
    'engageDeliveries',
    'engagePreferences',
    'engageWorkflows',
    'engageWorkflowRuns',
    'engageChatSessions',
    'engageChatMessages',
    'engageTranslations',
    'engageAnalyticsEvents',
  ];

  it('should export all 10 EngageOS tables in both SQLite and PostgreSQL schemas', () => {
    for (const tableName of engageTableNames) {
      expect((sqliteSchema as any)[tableName]).toBeDefined();
      expect((pgSchema as any)[tableName]).toBeDefined();
    }
  });

  it('should verify all EngageOS table columns match exactly between dialects', () => {
    for (const tableName of engageTableNames) {
      const sqliteTable = (sqliteSchema as any)[tableName];
      const pgTable = (pgSchema as any)[tableName];

      const sqliteCols = Object.keys(getTableColumns(sqliteTable));
      const pgCols = Object.keys(getTableColumns(pgTable));

      expect(sqliteCols.sort()).toEqual(pgCols.sort());
    }
  });
});
