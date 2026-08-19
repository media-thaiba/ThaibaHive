import { EtlEngine } from '../lakehouse/etl-engine';
import { SchemaManager } from '../lakehouse/schema-manager';
import { PartitionManager } from '../lakehouse/partition-manager';

describe('Data Lakehouse Integration & Partitioning', () => {
  it('should run incremental extraction and build tenant isolated partitioned paths', async () => {
    const etlEngine = new EtlEngine();
    const schema = SchemaManager.getSchema('student');

    const result = await etlEngine.executeIncrementalEtl({
      jobId: 'job-test-101',
      tenantId: 'campus-alpha',
      domain: 'student',
      schema,
      fetchRecords: async (tId) => [
        { id: 's-1', tenantId: tId, firstName: 'Alice', lastName: 'Walker', status: 'active', updatedAt: '2026-08-03T12:00:00Z', enrollmentDate: '2026-01-01T00:00:00Z' },
        { id: 's-2', tenantId: 'campus-beta', firstName: 'Bob', lastName: 'Smith', status: 'active', updatedAt: '2026-08-03T12:00:00Z', enrollmentDate: '2026-01-01T00:00:00Z' }, // Cross-tenant record
      ],
    });

    expect(result.jobResult.recordCount).toBe(1);
    expect(result.jobResult.partitionPath).toContain('tenant_id=campus-alpha');
    expect(result.jobResult.partitionPath).toContain('domain=student');
    expect(result.buffer).toBeInstanceOf(Buffer);

    const parsed = PartitionManager.parsePartitionPath(result.jobResult.partitionPath);
    expect(parsed.tenantId).toBe('campus-alpha');
    expect(parsed.domain).toBe('student');
  });

  it('should enforce schema compatibility during evolution checks', () => {
    const oldSchema = SchemaManager.getSchema('student');
    const newCompatibleSchema = {
      columns: [
        ...oldSchema.columns,
        { name: 'middleName', type: 'string' as const, nullable: true },
      ],
    };

    const comp = SchemaManager.validateCompatibility(oldSchema, newCompatibleSchema);
    expect(comp.compatible).toBe(true);
    expect(comp.errors).toHaveLength(0);

    const breakingSchema = {
      columns: [
        { name: 'id', type: 'int32' as const, nullable: false }, // Type change
      ],
    };

    const breakingComp = SchemaManager.validateCompatibility(oldSchema, breakingSchema);
    expect(breakingComp.compatible).toBe(false);
    expect(breakingComp.errors.length).toBeGreaterThan(0);
  });
});
