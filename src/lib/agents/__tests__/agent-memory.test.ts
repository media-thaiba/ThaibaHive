import { AgentMemoryStore } from "../memory/memory-store";
import { ContextInjector } from "../memory/context-injector";
import { AgentDbStore } from "../../db/agent-store";

describe("Agent Memory Store & Context Injector Suite (AIG-015)", () => {
  let memoryStore: AgentMemoryStore;
  let injector: ContextInjector;
  let dbStore: AgentDbStore;

  beforeEach(() => {
    dbStore = AgentDbStore.getInstance();
    dbStore.clearMemoryStore();

    memoryStore = new AgentMemoryStore(dbStore);
    injector = new ContextInjector(memoryStore);
  });

  it("stores and recalls episodic and semantic memories with tenant isolation", async () => {
    await memoryStore.remember({
      agentId: "academic-agent",
      institutionId: "inst_alpha",
      scope: "episodic",
      content: { action: "attendance_reconciled", sectionId: "10-A", rate: 92 },
      importance: 0.85,
    });

    await memoryStore.remember({
      agentId: "academic-agent",
      institutionId: "inst_alpha",
      scope: "semantic",
      content: { policy: "Minimum 75% attendance mandatory for exam eligibility" },
      importance: 0.95,
    });

    // Recall within tenant
    const alphaRecall = await memoryStore.recall({
      institutionId: "inst_alpha",
      agentId: "academic-agent",
      scope: "semantic",
    });

    expect(alphaRecall.entries.length).toBe(1);
    expect(alphaRecall.entries[0].content.policy).toContain("Minimum 75%");

    // Negative assertion: cross-tenant isolation
    const betaRecall = await memoryStore.recall({
      institutionId: "inst_beta",
      agentId: "academic-agent",
    });
    expect(betaRecall.entries.length).toBe(0);
  });

  it("builds prompt context packets with episodic and semantic sections", async () => {
    await memoryStore.remember({
      agentId: "finance-agent",
      institutionId: "inst_alpha",
      scope: "semantic",
      content: { rule: "Requisitions exceeding 50,000 INR require Principal sign-off" },
      importance: 0.9,
    });

    await memoryStore.remember({
      agentId: "finance-agent",
      institutionId: "inst_alpha",
      scope: "episodic",
      content: { lastAudit: "3-way match passed for invoice INV-9901" },
      importance: 0.8,
    });

    const packet = await injector.buildContextPacket({
      agentId: "finance-agent",
      institutionId: "inst_alpha",
      currentGoal: "Review purchase requisition",
    });

    expect(packet.semanticContext.length).toBe(1);
    expect(packet.episodicContext.length).toBe(1);
    expect(packet.injectedPromptSection).toContain("### Relevant Institutional Knowledge & Policies:");
    expect(packet.injectedPromptSection).toContain("### Recent Relevant Agent History:");
  });

  it("prunes expired memory records correctly", async () => {
    const expiredIso = new Date(Date.now() - 3600000).toISOString();
    await memoryStore.remember({
      agentId: "security-agent",
      institutionId: "inst_alpha",
      scope: "episodic",
      content: { tempIncident: "Zone 1 gate open" },
      expiresAt: expiredIso,
    });

    const prunedCount = await memoryStore.pruneExpired();
    expect(prunedCount).toBe(1);

    const remaining = await memoryStore.recall({ institutionId: "inst_alpha" });
    expect(remaining.entries.length).toBe(0);
  });
});
