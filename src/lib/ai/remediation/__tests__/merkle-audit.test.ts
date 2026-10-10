import { MerkleAuditLedger } from "../../../agents/guardrails/merkle-ledger";

describe("MerkleAuditLedger Remediation Integration", () => {
  const testTenantId = "inst_merkle_rem_test_01";
  const ledger = MerkleAuditLedger.getInstance();

  it("records sequential remediation tool invocations and verifies chain integrity", async () => {
    // 1. Enqueue 5 sequential actions
    for (let i = 0; i < 5; i++) {
      await ledger.enqueueInvocation({
        agentId: "copilot-remediation-engine",
        toolName: `finance.tool_${i}`,
        institutionId: testTenantId,
        status: "success",
        durationMs: 45 + i,
        inputHash: `hash_in_${i}`,
        outputHash: `hash_out_${i}`,
        traceId: `trace_run_${i}`,
      });
    }

    // 2. Flush all batches
    await ledger.flushAll();

    // 3. Verify cryptographic Merkle chain integrity
    const verification = await ledger.verifyChainIntegrity(testTenantId);
    expect(verification.valid).toBe(true);
    expect(verification.totalEntries).toBeGreaterThanOrEqual(5);
  });
});
