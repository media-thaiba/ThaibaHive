import crypto from 'crypto';
import { IndexRecommendation, IndexExecutionResult } from './types';
import { db } from '@/db';
import { indexTuningRecommendations, indexTuningLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const SAFE_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/;
const SAFE_CREATE_INDEX_DDL_REGEX =
  /^CREATE\s+(?:UNIQUE\s+)?INDEX\s+CONCURRENTLY\s+(?:IF\s+NOT\s+EXISTS\s+)?[a-zA-Z_][a-zA-Z0-9_]{0,62}\s+ON\s+[a-zA-Z_][a-zA-Z0-9_]{0,62}\s*\(\s*[a-zA-Z_][a-zA-Z0-9_]*(\s+(?:ASC|DESC))?(\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*(\s+(?:ASC|DESC))?)*\s*\)\s*;?$/i;

export class IndexAutoTuner {
  /**
   * Executes a recommended index DDL with non-blocking CONCURRENTLY & lock timeout safety guards
   */
  public async executeIndexRecommendation(rec: IndexRecommendation): Promise<IndexExecutionResult> {
    const startTime = Date.now();

    // Verify DDL safety invariant: MUST contain CONCURRENTLY and match strict single-statement DDL grammar
    if (!rec.indexDdl.toUpperCase().includes('CONCURRENTLY')) {
      throw new Error(`Safety Guard Rejected DDL: Index DDL must explicitly specify CONCURRENTLY. Found: ${rec.indexDdl}`);
    }
    if (
      !SAFE_IDENTIFIER_REGEX.test(rec.recommendedIndexName) ||
      !SAFE_CREATE_INDEX_DDL_REGEX.test(rec.indexDdl.trim())
    ) {
      throw new Error(`Safety Guard Rejected DDL: Untrusted or multi-statement DDL rejected: ${rec.indexDdl}`);
    }

    try {
      // Execute with lock_timeout safety guard
      await db.run(sql`SET LOCAL lock_timeout = '2000ms';`);
      await db.run(sql.raw(rec.indexDdl.trim()));

      const durationMs = Date.now() - startTime;

      // Update recommendation status
      await db
        .update(indexTuningRecommendations)
        .set({ status: 'APPLIED' })
        .where(eq(indexTuningRecommendations.id, rec.id));

      // Log execution
      await db.insert(indexTuningLogs).values({
        id: `log_${crypto.randomUUID()}`,
        recommendationId: rec.id,
        action: 'CREATE_CONCURRENTLY',
        indexName: rec.recommendedIndexName,
        executionDurationMs: durationMs,
        status: 'SUCCESS',
        createdAt: new Date().toISOString(),
      });

      return {
        recommendationId: rec.id,
        action: 'CREATE_CONCURRENTLY',
        indexName: rec.recommendedIndexName,
        executionDurationMs: durationMs,
        status: 'SUCCESS',
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;

      await db.insert(indexTuningLogs).values({
        id: `log_${crypto.randomUUID()}`,
        recommendationId: rec.id,
        action: 'CREATE_CONCURRENTLY',
        indexName: rec.recommendedIndexName,
        executionDurationMs: durationMs,
        status: 'FAILED',
        errorMessage: err.message || 'Execution error',
        createdAt: new Date().toISOString(),
      });

      return {
        recommendationId: rec.id,
        action: 'CREATE_CONCURRENTLY',
        indexName: rec.recommendedIndexName,
        executionDurationMs: durationMs,
        status: 'FAILED',
        errorMessage: err.message,
      };
    }
  }

  /**
   * Rolls back an applied index by issuing non-blocking DROP INDEX CONCURRENTLY
   */
  public async rollbackIndex(rec: IndexRecommendation): Promise<IndexExecutionResult> {
    const startTime = Date.now();
    if (!SAFE_IDENTIFIER_REGEX.test(rec.recommendedIndexName)) {
      throw new Error(`Safety Guard Rejected DDL: Invalid index identifier: ${rec.recommendedIndexName}`);
    }
    const dropDdl = `DROP INDEX CONCURRENTLY IF EXISTS ${rec.recommendedIndexName};`;

    try {
      await db.run(sql.raw(dropDdl));
      const durationMs = Date.now() - startTime;

      await db
        .update(indexTuningRecommendations)
        .set({ status: 'ROLLED_BACK' })
        .where(eq(indexTuningRecommendations.id, rec.id));

      await db.insert(indexTuningLogs).values({
        id: `log_${crypto.randomUUID()}`,
        recommendationId: rec.id,
        action: 'DROP_CONCURRENTLY',
        indexName: rec.recommendedIndexName,
        executionDurationMs: durationMs,
        status: 'SUCCESS',
        createdAt: new Date().toISOString(),
      });

      return {
        recommendationId: rec.id,
        action: 'DROP_CONCURRENTLY',
        indexName: rec.recommendedIndexName,
        executionDurationMs: durationMs,
        status: 'SUCCESS',
      };
    } catch (err: any) {
      return {
        recommendationId: rec.id,
        action: 'DROP_CONCURRENTLY',
        indexName: rec.recommendedIndexName,
        executionDurationMs: Date.now() - startTime,
        status: 'FAILED',
        errorMessage: err.message,
      };
    }
  }
}
