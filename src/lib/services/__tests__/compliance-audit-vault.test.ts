import { ComplianceAuditVault, GENESIS_HASH } from "../compliance-audit-vault";

jest.mock("@thaiba/db", () => {
  return {
    db: {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(true),
      }),
    },
    complianceAuditVault: {},
  };
});

describe("ComplianceAuditVault Service", () => {
  it("calculates deterministic SHA-256 record hash", () => {
    const hash = ComplianceAuditVault.calculateRecordHash(
      GENESIS_HASH,
      JSON.stringify({ action: "user_login" }),
      "2026-07-31T10:00:00Z",
      "usr_101"
    );

    expect(hash).toHaveLength(64); // 64 hex characters
    expect(hash).toBe(
      ComplianceAuditVault.calculateRecordHash(
        GENESIS_HASH,
        JSON.stringify({ action: "user_login" }),
        "2026-07-31T10:00:00Z",
        "usr_101"
      )
    );
  });
});
