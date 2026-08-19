import { RemediationEngine } from "../remediation/remediation-engine";
import { ApprovalGateway } from "../remediation/approval-gateway";
import { EventBus } from "../observability/event-bus";
import { db } from "../../db";
import { remediationHistory, swarmEvents } from "../../db/schema";
import { eq } from "drizzle-orm";

describe("Swarm Observability & Remediation E2E Flow", () => {
  beforeEach(async () => {
    try {
      await db.delete(remediationHistory).run();
      await db.delete(swarmEvents).run();
    } catch (e) {
      // Ignore DB errors
    }
  });

  test("Continuous Compliance -> Remediation Workflow -> Approval Gate -> Healer -> SSE Telemetry E2E Flow", async () => {
    const engine = RemediationEngine.getInstance();
    const gateway = ApprovalGateway.getInstance();
    const bus = EventBus.getInstance();

    const finding = {
      id: "e2e_finding_001",
      framework: "SOC2",
      ruleName: "DB_LEAK_DETECTION",
      severity: "high" as const,
      description: "Unencrypted customer PII detected in debug logs",
      institutionId: "inst_e2e_tenant",
    };

    const workflow = await engine.handleComplianceFinding(finding);
    expect(workflow).toBeDefined();
    expect(workflow!.approvalStatus).toBe("pending");

    const buffer = bus.getRingBuffer();
    const initEvent = buffer.find(
      (e) => e.type === "event" && e.data.eventSource === "remediation-engine"
    );
    expect(initEvent).toBeDefined();

    const approved = await gateway.approveAction(workflow!.id, workflow!.approvalKey!);
    expect(approved).toBe(true);

    const dbRecord = await db
      .select()
      .from(remediationHistory)
      .where(eq(remediationHistory.id, workflow!.id))
      .get();

    expect(dbRecord).toBeDefined();
    expect(dbRecord!.approvalStatus).toBe("approved");

    await engine.enqueue("database_pool", async () => {}); 

    const finalBuffer = bus.getRingBuffer();
    const healEvent = finalBuffer.find(
      (e) => e.type === "event" && e.data.eventSource === "remediation-engine" && e.data.message.includes("succeeded")
    );
    expect(healEvent).toBeDefined();
  });
});
