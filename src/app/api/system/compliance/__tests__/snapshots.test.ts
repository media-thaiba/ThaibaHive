import { GET, POST } from "../snapshots/route";

jest.mock("@/lib/auth/require-auth", () => ({
  requireAuth: (fn: any) => fn,
}));

jest.mock("@/db", () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                id: "snp-1",
                tenantId: "default",
                snapshotType: "SCHEDULED",
                storageUri: "file://./test.json.gz",
                checksumSha256: "abc",
                signature: "sig",
                signerPublicKey: "pub",
                entityCounts: JSON.stringify({ users: 5 }),
                metadata: "{}",
                status: "ACTIVE",
                retentionTier: "HOT",
                createdAt: "2026-08-19T00:00:00Z",
              },
            ]),
          }),
        }),
      }),
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue({}),
    }),
  },
}));

describe("/api/system/compliance/snapshots", () => {
  it("GET returns list of stored snapshots", async () => {
    const req = new Request("http://localhost:3000/api/system/compliance/snapshots?tenantId=default");
    const res = await GET(req, { role: "admin" });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.snapshots.length).toBe(1);
    expect(json.snapshots[0].id).toBe("snp-1");
  });
});
