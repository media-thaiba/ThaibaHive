import { SyncConflictResolver } from "../offline/sync-conflict-resolver";

describe("FED-012: Push-to-Sync Conflict Resolution Engine Test Suite", () => {
  it("resolves mutation when no server record exists", () => {
    const resolver = new SyncConflictResolver();
    const result = resolver.resolveMutation({
      id: "mut-1",
      mutationType: "CREATE",
      entityType: "student_attendance",
      payload: { studentId: "s1", status: "present" },
      clientTimestamp: new Date().toISOString(),
    });

    expect(result.status).toBe("SYNCED");
    expect(result.mergedData?.status).toBe("present");
  });

  it("applies Last-Writer-Wins (LWW) merging when client mutation is newer", () => {
    const resolver = new SyncConflictResolver();
    const past = new Date(Date.now() - 10000).toISOString();
    const now = new Date().toISOString();

    const result = resolver.resolveMutation(
      {
        id: "mut-2",
        mutationType: "UPDATE",
        entityType: "student_attendance",
        payload: { status: "excused", notes: "Doctor note" },
        clientTimestamp: now,
      },
      {
        id: "rec-1",
        tenantId: "t1",
        entityType: "student_attendance",
        data: { status: "absent", notes: "No note" },
        updatedAt: past,
      }
    );

    expect(result.status).toBe("SYNCED");
    expect(result.mergedData?.status).toBe("excused");
    expect(result.mergedData?.notes).toBe("Doctor note");
  });

  it("flags conflict when server record is newer and fields collide", () => {
    const resolver = new SyncConflictResolver();
    const past = new Date(Date.now() - 10000).toISOString();
    const now = new Date().toISOString();

    const result = resolver.resolveMutation(
      {
        id: "mut-3",
        mutationType: "UPDATE",
        entityType: "grade",
        payload: { score: 95, remarks: "Excellent" },
        clientTimestamp: past,
      },
      {
        id: "rec-2",
        tenantId: "t1",
        entityType: "grade",
        data: { score: 80, remarks: "Good" },
        updatedAt: now,
      }
    );

    expect(result.status).toBe("CONFLICT");
    expect(result.conflictFields).toContain("score");
  });
});
