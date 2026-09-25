import * as sqliteSchema from '../../../../packages/db/schema';
import * as pgSchema from '../../../../packages/db/schema.pg';
import { getTableColumns } from 'drizzle-orm';

describe('Curricular Graph & Autonomous Advising Schema Parity & Table Integrity (Sprint-051)', () => {
  const curriculumTableNames = [
    'curriculumPrograms',
    'curriculumCourses',
    'curriculumPrerequisites',
    'curriculumDegreePlans',
    'curriculumPlanCourses',
    'curriculumTransferArticulations',
    'curriculumAdvisingSessions',
    'curriculumAdvisingMessages',
    'curriculumRetentionAlerts',
    'curriculumAuditLogs',
  ];

  it('should export all 10 ADVISE-MESH curriculum tables in both SQLite and PostgreSQL schemas', () => {
    for (const tableName of curriculumTableNames) {
      expect((sqliteSchema as any)[tableName]).toBeDefined();
      expect((pgSchema as any)[tableName]).toBeDefined();
    }
  });

  it('should verify all ADVISE-MESH table columns match exactly between dialects', () => {
    for (const tableName of curriculumTableNames) {
      const sqliteTable = (sqliteSchema as any)[tableName];
      const pgTable = (pgSchema as any)[tableName];

      const sqliteCols = Object.keys(getTableColumns(sqliteTable));
      const pgCols = Object.keys(getTableColumns(pgTable));

      expect(sqliteCols.sort()).toEqual(pgCols.sort());
    }
  });
});
