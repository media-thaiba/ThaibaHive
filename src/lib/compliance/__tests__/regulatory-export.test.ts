import { RegulatoryExportEngine } from "../regulatory-export-engine";

// Mock dependencies
jest.mock("@/db", () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}));

jest.mock("../forensic-snapshot-engine", () => ({
  forensicSnapshotEngine: {
    captureSnapshot: jest.fn().mockResolvedValue({
      id: "snp-export-test",
      checksumSha256: "0".repeat(64),
      signature: "mock-sig",
      entityCounts: { users: 10, institutions: 2 },
    }),
  },
}));

describe("RegulatoryExportEngine", () => {
  let engine: RegulatoryExportEngine;

  beforeEach(() => {
    engine = new RegulatoryExportEngine();
  });

  it("generates a signed SOC 2 Type II compliance dossier", async () => {
    const pack = await engine.generateExportPack({
      standard: "SOC2",
      tenantId: "default",
    });

    expect(pack.exportId).toBeDefined();
    expect(pack.standard).toBe("SOC2");
    expect(pack.template.title).toContain("SOC 2");
    expect(pack.checksumSha256).toHaveLength(64);
    expect(pack.digitalSignature).toBeDefined();
    expect(pack.signerPublicKey).toBeDefined();
    expect(pack.evidenceData.latestSnapshot.id).toBe("snp-export-test");
  });

  it("generates ISO 27001, GDPR, and HIPAA compliance dossiers", async () => {
    const isoPack = await engine.generateExportPack({ standard: "ISO27001" });
    const gdprPack = await engine.generateExportPack({ standard: "GDPR" });
    const hipaaPack = await engine.generateExportPack({ standard: "HIPAA" });

    expect(isoPack.template.standard).toBe("ISO27001");
    expect(gdprPack.template.standard).toBe("GDPR");
    expect(hipaaPack.template.standard).toBe("HIPAA");
  });
});
