/**
 * Repair Cryptographic Audit Hash Chain Script
 */

import { db } from '../../src/db';
import { auditLogs, auditMerkleRoots } from '@thaiba/db/schema';
import { eq, asc } from 'drizzle-orm';
import {
  computePayloadHash,
  computeAuditBlockHash,
  buildMerkleTree,
  GENESIS_PREV_HASH,
} from '../../src/lib/audit/crypto-audit-engine';

async function repairChain() {
  console.log('Repairing cryptographic audit chain in database...');

  const allEntries = await db
    .select()
    .from(auditLogs)
    .orderBy(asc(auditLogs.timestamp), asc(auditLogs.createdAt));

  // Group by tenant
  const tenantGroups: Record<string, typeof allEntries> = {};
  for (const entry of allEntries) {
    const tId = entry.tenantId || 'default';
    if (!tenantGroups[tId]) tenantGroups[tId] = [];
    tenantGroups[tId].push(entry);
  }

  for (const [tenantId, entries] of Object.entries(tenantGroups)) {
    console.log(`Processing tenant '${tenantId}' with ${entries.length} entries...`);
    let previousHash = GENESIS_PREV_HASH;
    const blockHashes: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      let payloadObj = null;
      try {
        payloadObj = e.payload ? JSON.parse(e.payload) : null;
      } catch {
        payloadObj = e.payload;
      }

      const payloadHash = computePayloadHash(payloadObj);
      const currentHash = computeAuditBlockHash({
        previousHash,
        timestamp: e.timestamp,
        tenantId: e.tenantId || 'default',
        userId: e.userId,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId,
        payloadHash,
        nonce: '0',
      });

      await db
        .update(auditLogs)
        .set({
          previousHash,
          currentHash,
        })
        .where(eq(auditLogs.id, e.id));

      previousHash = currentHash;
      blockHashes.push(currentHash);
    }

    if (blockHashes.length > 0) {
      const tree = buildMerkleTree(blockHashes);
      console.log(`Tenant '${tenantId}' repaired. New Merkle root: ${tree.root.substring(0, 16)}...`);
    }
  }

  console.log('✅ Audit chain repair complete.');
}

repairChain().catch(console.error);
