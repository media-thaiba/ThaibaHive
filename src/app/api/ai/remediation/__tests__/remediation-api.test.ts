import { POST as triggerRemediation } from "../trigger/route";
import { POST as approveGate } from "../approve/route";
import { GET as getGates } from "../gates/route";
import { GET as getMerkleAudit } from "../../audit/merkle/route";

const mockInstId = "inst_test_rem_api_001";
const mockStaffId = "staff_test_rem_api_001";

const currentMockSession = {
  staffId: mockStaffId,
  email: "remediation_tester@thaiba.dev",
  role: "admin",
  employeeId: "EMP-REM-01",
  name: "Remediation Admin",
  tokenVersion: 0,
  institutionId: mockInstId,
};

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn().mockImplementation(() => Promise.resolve(currentMockSession)),
    resolveScopedInstitutionId: jest.fn().mockImplementation(() => currentMockSession.institutionId),
    resolveRequestInstitution: jest.fn().mockImplementation(() => Promise.resolve(currentMockSession.institutionId)),
    resolveInstitutionScopeForSession: jest.fn().mockImplementation(() => Promise.resolve(currentMockSession.institutionId)),
  };
});

describe("Remediation & Merkle Audit API Integration Tests", () => {
  it("executes full HITL remediation flow via API and verifies Merkle audit", async () => {
    // 1. Trigger remediation plan requiring HITL
    const triggerReq = new Request("http://localhost/api/ai/remediation/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Tuition Fee Reconciliation",
        triggerType: "copilot",
        steps: [
          {
            id: "step_hitl_fee",
            name: "Reconcile Fee Variance",
            tool: "finance.reconcileFee",
            params: { invoiceId: "inv_101", adjustmentAmount: 1500 },
            requiresHitl: true,
            requiresStepUpAuth: true,
          },
        ],
      }),
    });

    const triggerRes = await triggerRemediation(triggerReq);
    expect(triggerRes.status).toBe(200);
    const triggerJson = await triggerRes.json();
    expect(triggerJson.success).toBe(true);
    expect(triggerJson.result.status).toBe("waiting_approval");

    const gateId = triggerJson.result.stepResults[0].gateId;
    expect(gateId).toBeDefined();

    // 2. GET pending gates
    const gatesReq = new Request("http://localhost/api/ai/remediation/gates", { method: "GET" });
    const gatesRes = await getGates(gatesReq);
    expect(gatesRes.status).toBe(200);
    const gatesJson = await gatesRes.json();
    expect(gatesJson.success).toBe(true);
    expect(gatesJson.gates.some((g: any) => g.id === gateId)).toBe(true);

    // 3. Approve gate with fresh Step-Up auth
    const approveReq = new Request("http://localhost/api/ai/remediation/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gateId,
        decision: "approve",
        stepUpFreshnessSeconds: 90, // Fresh!
      }),
    });

    const approveRes = await approveGate(approveReq);
    expect(approveRes.status).toBe(200);
    const approveJson = await approveRes.json();
    expect(approveJson.success).toBe(true);
    expect(approveJson.decision).toBe("approve");
    expect(approveJson.result.status).toBe("completed");

    // 4. Verify cryptographic Merkle audit integrity
    const merkleReq = new Request("http://localhost/api/ai/audit/merkle", { method: "GET" });
    const merkleRes = await getMerkleAudit(merkleReq);
    expect(merkleRes.status).toBe(200);
    const merkleJson = await merkleRes.json();
    expect(merkleJson.success).toBe(true);
    expect(merkleJson.verification.valid).toBe(true);
  });
});
