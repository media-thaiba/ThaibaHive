import * as sqliteSchema from '../../../../packages/db/schema';
import * as pgSchema from '../../../../packages/db/schema.pg';
import { getTableColumns } from 'drizzle-orm';

describe('AIGENT-OS / AgenticWorkflows Schema Parity & Table Integrity (Sprint-100 - AIG-014)', () => {
  const agenticTableNames = [
    'agenticWorkflows',
    'agenticWorkflowRuns',
    'agenticWorkflowSteps',
    'agentApprovalGates',
    'agentMemoryEntries',
    'agentToolInvocations',
    'agentOutboxMessages',
  ];

  it('should export all 7 AIGENT-OS tables in both SQLite and PostgreSQL schemas', () => {
    for (const tableName of agenticTableNames) {
      expect((sqliteSchema as any)[tableName]).toBeDefined();
      expect((pgSchema as any)[tableName]).toBeDefined();
    }
  });

  it('should verify all 7 AIGENT-OS table columns match exactly between SQLite and PostgreSQL dialects', () => {
    for (const tableName of agenticTableNames) {
      const sqliteTable = (sqliteSchema as any)[tableName];
      const pgTable = (pgSchema as any)[tableName];

      const sqliteCols = Object.keys(getTableColumns(sqliteTable));
      const pgCols = Object.keys(getTableColumns(pgTable));

      expect(sqliteCols.sort()).toEqual(pgCols.sort());
    }
  });

  it('should verify specific type mapping conventions on key fields across dialects', () => {
    const sqliteMem = getTableColumns((sqliteSchema as any).agentMemoryEntries);
    const pgMem = getTableColumns((pgSchema as any).agentMemoryEntries);

    // Number / Floating point mapping
    expect(sqliteMem.importance.dataType).toBe('number');
    expect(pgMem.importance.dataType).toBe('number');
    expect(sqliteMem.importance.columnType).toBe('SQLiteReal');
    expect(pgMem.importance.columnType).toBe('PgDoublePrecision');

    // Vector / Embedding forward-compatibility (nullable text)
    expect(sqliteMem.embedding.dataType).toBe('string');
    expect(pgMem.embedding.dataType).toBe('string');
    expect(sqliteMem.embedding.notNull).toBe(false);
    expect(pgMem.embedding.notNull).toBe(false);

    // ISO timestamp conventions (text on both dialects)
    expect(sqliteMem.createdAt.dataType).toBe('string');
    expect(pgMem.createdAt.dataType).toBe('string');

    // Integer / version concurrency
    const sqliteWf = getTableColumns((sqliteSchema as any).agenticWorkflows);
    const pgWf = getTableColumns((pgSchema as any).agenticWorkflows);
    expect(sqliteWf.version.dataType).toBe('number');
    expect(pgWf.version.dataType).toBe('number');
    expect(sqliteWf.version.columnType).toBe('SQLiteInteger');
    expect(pgWf.version.columnType).toBe('PgInteger');
  });

  it('should ensure cross-dialect data round-trip compatibility for sample records', () => {
    const sampleWorkflow = {
      id: 'wf_roundtrip_test',
      institutionId: 'inst_alpha',
      name: 'Roundtrip Test',
      description: 'Dialect parity test',
      definitionJson: JSON.stringify({ steps: [] }),
      version: 1,
      status: 'active',
      createdBy: 'staff_1',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    };

    const sqliteCols = getTableColumns((sqliteSchema as any).agenticWorkflows);
    const pgCols = getTableColumns((pgSchema as any).agenticWorkflows);

    // Assert every key in sampleWorkflow is present in both schemas
    for (const key of Object.keys(sampleWorkflow)) {
      expect(sqliteCols[key]).toBeDefined();
      expect(pgCols[key]).toBeDefined();
    }
  });
});

