import { ParquetSchema, ParquetColumnSchema } from './types';
import { StudentDomainSchema, AttendanceDomainSchema, FinanceDomainSchema } from './schemas';

export class SchemaManager {
  private static registry: Map<string, ParquetSchema> = new Map([
    ['student', StudentDomainSchema],
    ['attendance', AttendanceDomainSchema],
    ['finance', FinanceDomainSchema],
  ]);

  public static getSchema(domain: string): ParquetSchema {
    const schema = this.registry.get(domain);
    if (!schema) {
      throw new Error(`No lakehouse export schema registered for domain '${domain}'`);
    }
    return schema;
  }

  public static registerSchema(domain: string, schema: ParquetSchema): void {
    this.registry.set(domain, schema);
  }

  /**
   * Validates backward compatibility between old and new schema versions
   */
  public static validateCompatibility(oldSchema: ParquetSchema, newSchema: ParquetSchema): { compatible: boolean; errors: string[] } {
    const errors: string[] = [];
    const oldColMap = new Map<string, ParquetColumnSchema>(oldSchema.columns.map((c) => [c.name, c]));

    for (const [name, oldCol] of oldColMap.entries()) {
      const newCol = newSchema.columns.find((c) => c.name === name);
      if (!newCol) {
        errors.push(`Field '${name}' was deleted in new schema (breaking change)`);
        continue;
      }
      if (newCol.type !== oldCol.type) {
        errors.push(`Field '${name}' type changed from ${oldCol.type} to ${newCol.type} (breaking change)`);
      }
      if (oldCol.nullable && !newCol.nullable) {
        errors.push(`Field '${name}' changed from nullable to non-nullable (breaking change)`);
      }
    }

    return {
      compatible: errors.length === 0,
      errors,
    };
  }
}
