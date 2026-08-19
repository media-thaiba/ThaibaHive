import { RemediationEngine } from "../remediation/remediation-engine";
import { ApprovalGateway } from "../remediation/approval-gateway";
import { HealerConnector } from "../remediation/healer-connector";
import { db } from "../../db";
import { remediationHistory } from "../../db/schema";
import { eq } from "drizzle-orm";

describe("Remediation Engine & Workflows", () => {
  beforeEach(async () => {
    try {
      await db.delete(remediationHistory).run();
    } catch (e) {
      // Ignore DB errors in initialization
    }
  });

  test("handleComplianceFinding maps rule to database-healer and triggers execution", async () => {
    const engine = RemediationEngine.getInstance();
    
    const workflow = await engine.handleComplianceFinding({
      id: "find_001",
      framework: "GDPR",
      ruleName: "DB_ENCRYPTION_REST",
      severity: "medium",
      description: "Database is unencrypted",
      institutionId: "inst_test_1"
    });

    expect(workflow).toBeDefined();
    if (workflow) {
      expect(workflow.actionTriggered).toBe("database-healer");
      expect(workflow.approvalStatus).toBe("none");
      expect(workflow.outcome).toBe("pending");
    }
  });

  test("handleComplianceFinding gates critical/high findings under pending approval", async () => {
    const engine = RemediationEngine.getInstance();
    
    const workflow = await engine.handleComplianceFinding({
      id: "find_002",
      framework: "SOC2",
      ruleName: "DATA_LEAK",
      severity: "critical",
      description: "Data leak detected",
      institutionId: "inst_test_1"
    });

    expect(workflow).toBeDefined();
    if (workflow) {
      expect(workflow.approvalStatus).toBe("pending");
      expect(workflow.approvalKey).toBeDefined();
      expect(workflow.outcome).toBe("pending");
    }
  });

  test("ApprovalGateway approves pending action and runs healer", async () => {
    const engine = RemediationEngine.getInstance();
    const gateway = ApprovalGateway.getInstance();

    const workflow = await engine.handleComplianceFinding({
      id: "find_003",
      framework: "SOC2",
      ruleName: "DB_LEAK",
      severity: "high",
      description: "Potential DB leak",
      institutionId: "inst_test_1"
    });

    expect(workflow).toBeDefined();
    if (workflow) {
      const approved = await gateway.approveAction(workflow.id, workflow.approvalKey!);
      expect(approved).toBe(true);

      const updated = await db
        .select()
        .from(remediationHistory)
        .where(eq(remediationHistory.id, workflow.id))
        .get();

      expect(updated).toBeDefined();
      expect(updated!.approvalStatus).toBe("approved");
    }
  });

  test("ApprovalGateway rejects pending action", async () => {
    const engine = RemediationEngine.getInstance();
    const gateway = ApprovalGateway.getInstance();

    const workflow = await engine.handleComplianceFinding({
      id: "find_004",
      framework: "SOC2",
      ruleName: "DB_LEAK",
      severity: "high",
      description: "Potential DB leak",
      institutionId: "inst_test_1"
    });

    expect(workflow).toBeDefined();
    if (workflow) {
      const rejected = await gateway.rejectAction(workflow.id, workflow.approvalKey!);
      expect(rejected).toBe(true);

      const updated = await db
        .select()
        .from(remediationHistory)
        .where(eq(remediationHistory.id, workflow.id))
        .get();

      expect(updated).toBeDefined();
      expect(updated!.approvalStatus).toBe("rejected");
      expect(updated!.outcome).toBe("failed");
    }
  });

  test("HealerConnector executes actions with valid signatures", async () => {
    const connector = new HealerConnector();
    const success = await connector.executeHealer("database-healer");
    expect(success).toBe(true);
  });
});
