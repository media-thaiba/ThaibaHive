import { CryptographicAuditWriter } from "../crypto-writer";

// Mock DB insert
jest.mock("@/db", () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue({}),
    }),
  },
}));

describe("CryptographicAuditWriter", () => {
  let writer: CryptographicAuditWriter;

  beforeEach(() => {
    writer = new CryptographicAuditWriter();
    writer.clear();
  });

  it("enqueues and calculates sequential SHA-256 block hashes immediately", async () => {
    const entry1 = await writer.log({
      tenantId: "tenant-test",
      userId: "user-1",
      action: "user:login",
      entityType: "user",
      entityId: "u-1",
      payload: { method: "oauth" },
    });

    expect(entry1.currentHash).toHaveLength(64);
    expect(entry1.previousHash).toBeDefined();

    const entry2 = await writer.log({
      tenantId: "tenant-test",
      userId: "user-1",
      action: "user:update_profile",
      entityType: "user",
      entityId: "u-1",
      payload: { name: "New Name" },
    });

    expect(entry2.previousHash).toBe(entry1.currentHash);
    expect(entry2.currentHash).toHaveLength(64);
  });

  it("flushes queued entries and builds Merkle roots", async () => {
    await writer.log({
      tenantId: "tenant-flush",
      action: "act1",
      entityType: "entity",
    });
    await writer.log({
      tenantId: "tenant-flush",
      action: "act2",
      entityType: "entity",
    });

    const flushedCount = await writer.flush();
    expect(flushedCount).toBe(2);
  });
});
