import * as sqliteSchema from '../../../../packages/db/schema';
import * as pgSchema from '../../../../packages/db/schema.pg';
import { getTableColumns } from 'drizzle-orm';

describe('Knowledge Mesh & Copilot Schema Parity & Table Integrity', () => {
  const kmTableNames = [
    'kmEntities',
    'kmRelations',
    'kmDocuments',
    'kmChunks',
    'kmEmbeddings',
    'kmDegreePrograms',
    'kmCoursePrerequisites',
    'kmAdvisingSessions',
    'kmAdvisingInterventions',
    'kmTranslationCache',
  ];

  it('should export all 10 KM tables in both SQLite and PostgreSQL schemas', () => {
    for (const tableName of kmTableNames) {
      expect((sqliteSchema as any)[tableName]).toBeDefined();
      expect((pgSchema as any)[tableName]).toBeDefined();
    }
  });

  it('should verify all KM table columns match exactly between dialects', () => {
    for (const tableName of kmTableNames) {
      const sqliteTable = (sqliteSchema as any)[tableName];
      const pgTable = (pgSchema as any)[tableName];

      const sqliteCols = Object.keys(getTableColumns(sqliteTable));
      const pgCols = Object.keys(getTableColumns(pgTable));

      expect(sqliteCols.sort()).toEqual(pgCols.sort());
    }
  });
});
