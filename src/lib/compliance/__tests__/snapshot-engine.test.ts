import { ForensicSnapshotEngine } from "../forensic-snapshot-engine";
import { snapshotStorageManager } from "../snapshot-storage";
import { snapshotReconstructor } from "../snapshot-reconstructor";

// Mock DB
jest.mock("@/db", () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([
          { id: "staff-1", email: "admin@test.com", role: "admin", isActive: true },
        ]),
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue({}),
    }),
  },
}));

describe("ForensicSnapshotEngine", () => {
  let engine: ForensicSnapshotEngine;

  beforeEach(() => {
    engine = new ForensicSnapshotEngine();
  });

  it("captures and verifies a point-in-time snapshot manifest", async () => {
    const manifest = await engine.captureSnapshot({
      tenantId: "tenant-snapshot-test",
      snapshotType: "MANUAL",
    });

    expect(manifest.id).toBeDefined();
    expect(manifest.checksumSha256).toHaveLength(64);
    expect(manifest.signature).toBeDefined();
    expect(manifest.signerPublicKey).toBeDefined();

    const verification = engine.verifySnapshot(manifest);
    expect(verification.valid).toBe(true);
  });

  it("diffs two snapshots accurately", () => {
    const baseManifest: any = {
      id: "snp-base",
      state: {
        usersAndRoles: [
          { id: "user-1", email: "alice@test.com", role: "staff", isActive: true },
          { id: "user-2", email: "bob@test.com", role: "staff", isActive: true },
        ],
        institutionConfig: [{ id: "inst-1", allocatedBudget: 10000, isActive: true }],
      },
    };

    const targetManifest: any = {
      id: "snp-target",
      state: {
        usersAndRoles: [
          { id: "user-1", email: "alice@test.com", role: "admin", isActive: true }, // role upgraded
          { id: "user-3", email: "carol@test.com", role: "staff", isActive: true }, // new user
        ],
        institutionConfig: [{ id: "inst-1", allocatedBudget: 15000, isActive: true }], // budget modified
      },
    };

    const diff = snapshotReconstructor.diffSnapshots(baseManifest, targetManifest);

    expect(diff.addedEntities.users.length).toBe(1);
    expect(diff.addedEntities.users[0].id).toBe("user-3");

    expect(diff.deletedEntities.users.length).toBe(1);
    expect(diff.deletedEntities.users[0].id).toBe("user-2");

    expect(diff.modifiedEntities.users.length).toBe(1);
    expect(diff.modifiedEntities.users[0].changes.role.before).toBe("staff");
    expect(diff.modifiedEntities.users[0].changes.role.after).toBe("admin");

    expect(diff.modifiedEntities.institutions.length).toBe(1);
    expect(diff.modifiedEntities.institutions[0].changes.allocatedBudget.after).toBe(15000);
  });
});
