import { ForensicSnapshotManifest, SnapshotDiffResult } from "./types";
import { snapshotStorageManager } from "./snapshot-storage";
import { forensicSnapshotEngine } from "./forensic-snapshot-engine";

export class SnapshotReconstructor {
  /**
   * Loads and cryptographically verifies a historical snapshot from storage
   */
  async loadAndVerify(storageUri: string): Promise<{ manifest: ForensicSnapshotManifest; verified: boolean; error?: string }> {
    try {
      const manifest = await snapshotStorageManager.load(storageUri);
      const verification = forensicSnapshotEngine.verifySnapshot(manifest);
      return {
        manifest,
        verified: verification.valid,
        error: verification.error,
      };
    } catch (err: any) {
      return {
        manifest: null as any,
        verified: false,
        error: err.message,
      };
    }
  }

  /**
   * Computes a precise structural and state difference between two snapshots
   */
  diffSnapshots(base: ForensicSnapshotManifest, target: ForensicSnapshotManifest): SnapshotDiffResult {
    const addedEntities: Record<string, any[]> = { users: [], institutions: [] };
    const deletedEntities: Record<string, any[]> = { users: [], institutions: [] };
    const modifiedEntities: Record<string, Array<{ id: string; changes: Record<string, { before: any; after: any }> }>> = {
      users: [],
      institutions: [],
    };

    // 1. Diff Users & Roles
    const baseUsers = new Map(base.state.usersAndRoles.map((u) => [u.id, u]));
    const targetUsers = new Map(target.state.usersAndRoles.map((u) => [u.id, u]));

    for (const [id, targetUser] of targetUsers.entries()) {
      if (!baseUsers.has(id)) {
        addedEntities.users.push(targetUser);
      } else {
        const baseUser = baseUsers.get(id)!;
        const changes: Record<string, { before: any; after: any }> = {};

        if (baseUser.role !== targetUser.role) {
          changes.role = { before: baseUser.role, after: targetUser.role };
        }
        if (baseUser.isActive !== targetUser.isActive) {
          changes.isActive = { before: baseUser.isActive, after: targetUser.isActive };
        }
        if (baseUser.email !== targetUser.email) {
          changes.email = { before: baseUser.email, after: targetUser.email };
        }

        if (Object.keys(changes).length > 0) {
          modifiedEntities.users.push({ id, changes });
        }
      }
    }

    for (const [id, baseUser] of baseUsers.entries()) {
      if (!targetUsers.has(id)) {
        deletedEntities.users.push(baseUser);
      }
    }

    // 2. Diff Institutions
    const baseInsts = new Map((base.state.institutionConfig || []).map((i) => [i.id, i]));
    const targetInsts = new Map((target.state.institutionConfig || []).map((i) => [i.id, i]));

    for (const [id, targetInst] of targetInsts.entries()) {
      if (!baseInsts.has(id)) {
        addedEntities.institutions.push(targetInst);
      } else {
        const baseInst = baseInsts.get(id)!;
        const changes: Record<string, { before: any; after: any }> = {};
        if (baseInst.allocatedBudget !== targetInst.allocatedBudget) {
          changes.allocatedBudget = { before: baseInst.allocatedBudget, after: targetInst.allocatedBudget };
        }
        if (baseInst.isActive !== targetInst.isActive) {
          changes.isActive = { before: baseInst.isActive, after: targetInst.isActive };
        }
        if (Object.keys(changes).length > 0) {
          modifiedEntities.institutions.push({ id, changes });
        }
      }
    }

    for (const [id, baseInst] of baseInsts.entries()) {
      if (!targetInsts.has(id)) {
        deletedEntities.institutions.push(baseInst);
      }
    }

    const totalAdded = addedEntities.users.length + addedEntities.institutions.length;
    const totalModified = modifiedEntities.users.length + modifiedEntities.institutions.length;
    const totalDeleted = deletedEntities.users.length + deletedEntities.institutions.length;

    const summary = `Diff Analysis (${base.id} -> ${target.id}): ${totalAdded} added, ${totalModified} modified, ${totalDeleted} deleted entities.`;

    return {
      baseSnapshotId: base.id,
      targetSnapshotId: target.id,
      addedEntities,
      modifiedEntities,
      deletedEntities,
      summary,
      timestamp: new Date().toISOString(),
    };
  }
}

export const snapshotReconstructor = new SnapshotReconstructor();
