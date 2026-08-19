/**
 * FED-020: End-to-End Integration Test Suite for Sprint-013
 *
 * Full lifecycle test across all 4 phases:
 * Phase 1 → Federated Governance
 * Phase 2 → Self-Healing Infrastructure
 * Phase 3 → Mobile Offline Sync
 * Phase 4 → Voice Intelligence
 */

import { PolicyVersionManager } from "../federated/policy-version-manager";
import { PolicySyncEngine } from "../federated/policy-sync-engine";
import { FederatedAuditAggregator } from "../federated/federated-audit-aggregator";
import { CrossTenantRoleMapper } from "../federated/cross-tenant-role-mapper";
import { QueryCircuitBreaker } from "../resilience/query-circuit-breaker";
import { DLQRetryHandler } from "../resilience/dlq-retry-handler";
import { SyncConflictResolver } from "../offline/sync-conflict-resolver";
import { SpeechToTextAdapter } from "../voice/speech-to-text-adapter";
import { VoiceQueryParser } from "../voice/voice-query-parser";

describe("FED-020: Sprint-013 End-to-End Integration Test Suite", () => {

  /**
   * PHASE 1: Federated Governance Lifecycle
   * Policy created → versioned → propagated → cross-tenant role mapped → audited
   */
  describe("Phase 1 — Federated Governance Lifecycle", () => {
    it("creates, versions, and propagates a multi-campus policy", async () => {
      const versionManager = new PolicyVersionManager();
      const engine = new PolicySyncEngine(versionManager);

      // 1. Create policy from institution-alpha
      const policy = engine.createPolicy(
        "institution-alpha",
        "Cross-Campus Attendance Policy",
        "ATTENDANCE",
        { minAttendance: 75, ruleVersion: "2026-v1" },
        "admin-001"
      );
      expect(policy.id).toBeDefined();
      expect(policy.status).toBe("DRAFT");

      // 2. Propagate to target campuses
      const propResult = engine.propagatePolicy(policy.id, [
        "institution-beta",
        "institution-gamma",
      ]);
      expect(propResult.success).toBe(true);
      expect(propResult.payload?.targetTenantIds).toHaveLength(2);

      // 3. Target campus receives policy
      const receiveResult = engine.receiveReplicatedPolicy(propResult.payload!);
      expect(receiveResult.success).toBe(true);
      expect(receiveResult.status).toBe("ACTIVE");

      // 4. Version history tracked
      const history = versionManager.getVersionHistory(policy.id);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(versionManager.verifyIntegrity(history[0])).toBe(true);
    });

    it("creates cross-tenant role mapping and audits the action", () => {
      const mapper = new CrossTenantRoleMapper();
      const aggregator = new FederatedAuditAggregator();

      // Map HOD from alpha to read-only in beta
      const mappingResult = mapper.createMapping({
        sourceInstitutionId: "institution-alpha",
        targetInstitutionId: "institution-beta",
        sourceRole: "hod",
        targetRole: "principal",
        permissions: ["attendance:read", "reports:read"],
      });
      expect(mappingResult.isValid).toBe(true);

      // Audit the mapping operation
      const auditEntry = aggregator.recordAuditLog(
        "institution-alpha",
        "ROLE_MAPPING_CREATED",
        "admin-001",
        "AUDIT",
        { mappingId: mappingResult.mapping?.id, targetRole: "principal" },
        "institution-alpha"
      );
      expect(auditEntry.severity).toBe("AUDIT");
      expect(auditEntry.tenantId).toBe("institution-alpha");
    });
  });

  /**
   * PHASE 2: Self-Healing Infrastructure Lifecycle
   * Circuit breaker trips → DLQ enqueues failed job → retried → success
   */
  describe("Phase 2 — Self-Healing Infrastructure Lifecycle", () => {
    it("circuit breaker detects failure, DLQ enqueues and retries to success", async () => {
      const cb = new QueryCircuitBreaker({
        name: "db-attendance-query",
        failureThreshold: 2,
        resetTimeoutMs: 5000,
        halfOpenMaxCalls: 1,
      });
      const dlq = new DLQRetryHandler({ maxAttempts: 3, baseDelayMs: 0 });

      // Simulate 2 consecutive DB failures → circuit trips
      let dbDown = true;
      const faultyQuery = async () => {
        if (dbDown) throw new Error("DB connection refused");
        return { rows: [] };
      };

      try { await cb.execute(faultyQuery); } catch {}
      try { await cb.execute(faultyQuery); } catch {}

      expect(cb.getState().state).toBe("OPEN");

      // Enqueue in DLQ
      const jobId = await dlq.enqueue({
        operationType: "ATTENDANCE_REPORT",
        payload: { campusId: "campus-north", date: "2026-08-01" },
        institutionId: "institution-alpha",
      });

      // DB comes back online
      dbDown = false;

      // Retry succeeds
      let retryResult: boolean = false;
      const retryFn = async (payload: Record<string, any>) => {
        retryResult = true;
        return true;
      };
      const outcome = await dlq.processRetryJob(jobId, retryFn);
      expect(outcome.success).toBe(true);
      expect(retryResult).toBe(true);
    });
  });

  /**
   * PHASE 3: Mobile Offline Sync Lifecycle
   * Client mutation enqueued → conflict resolver runs LWW → institution preserved
   */
  describe("Phase 3 — Mobile Offline Sync Lifecycle", () => {
    it("resolves LWW conflict and preserves institutionId authority", () => {
      const resolver = new SyncConflictResolver();

      const serverState = {
        id: "student-456",
        institutionId: "institution-alpha",
        name: "Fatima Al-Rashid",
        grade: "A",
        updatedAt: new Date(Date.now() - 30000).toISOString(),
      };

      const clientMutation = {
        id: "student-456",
        institutionId: "institution-beta", // Attempted cross-tenant change
        name: "Fatima Al-Rashid",
        grade: "A+", // Legitimate grade update
        updatedAt: new Date().toISOString(),
      };

      const merged = resolver.resolveFieldLevel(serverState, clientMutation);

      // Grade updated (client is newer)
      expect(merged.grade).toBe("A+");
      // institutionId preserved from server (immutable field)
      expect(merged.institutionId).toBe("institution-alpha");
    });

    it("processes resolveMutation for a standard PATCH sync", () => {
      const resolver = new SyncConflictResolver();

      const serverRecord = {
        id: "staff-789",
        tenantId: "institution-alpha",
        entityType: "staff",
        data: { name: "Ahmad Hassan", department: "Engineering" },
        updatedAt: new Date(Date.now() - 5000).toISOString(),
      };

      const mutation = {
        id: "mutation-001",
        mutationType: "UPDATE" as const,
        entityType: "staff",
        payload: { name: "Ahmad Hassan", department: "Sciences" },
        clientTimestamp: new Date().toISOString(),
      };

      const result = resolver.resolveMutation(mutation, serverRecord);
      expect(result.status).toBe("SYNCED");
      expect(result.mergedData?.department).toBe("Sciences");
    });
  });

  /**
   * PHASE 4: Voice Intelligence Lifecycle
   * STT processes audio → NLP parses intent → synthesized response generated
   */
  describe("Phase 4 — Executive Voice Intelligence Lifecycle", () => {
    it("processes voice query end-to-end from audio to synthesized response", async () => {
      const sttAdapter = new SpeechToTextAdapter();
      const parser = new VoiceQueryParser();

      // Simulate pre-transcribed executive query (as if Web Speech API ran)
      const sttResult = await sttAdapter.processAudioInput(
        undefined,
        "What is the student retention risk for South Campus this semester?",
        "pcm",
        "en-US"
      );
      expect(sttResult.transcript).toContain("retention risk");
      expect(sttResult.confidence).toBeGreaterThan(0.8);

      // Parse intent
      const parsedQuery = parser.parseTranscript(sttResult.transcript);
      expect(parsedQuery.intent).toBe("GET_RISK_ALERT");
      expect(parsedQuery.campusId).toBe("campus-south");
      expect(parsedQuery.synthesizedAudioText).toContain("high-risk students");
    });

    it("routes financial margin query to correct intent with campus entity", async () => {
      const sttAdapter = new SpeechToTextAdapter();
      const parser = new VoiceQueryParser();

      const sttResult = await sttAdapter.processAudioInput(
        undefined,
        "Show me the financial operating margin for the East campus",
        "pcm",
        "en-US"
      );

      const parsedQuery = parser.parseTranscript(sttResult.transcript);
      expect(parsedQuery.intent).toBe("GET_FINANCIAL_MARGIN");
      expect(parsedQuery.campusId).toBe("campus-east");
    });
  });

  /**
   * CROSS-PHASE: Multi-tenant boundary enforcement
   */
  describe("Cross-Phase — Multi-Tenant Governance Summary", () => {
    it("confirms all 4 phase services are instantiable and functional", () => {
      const versionManager = new PolicyVersionManager();
      const engine = new PolicySyncEngine(versionManager);
      const aggregator = new FederatedAuditAggregator();
      const mapper = new CrossTenantRoleMapper();
      const cb = new QueryCircuitBreaker({ name: "e2e-check", failureThreshold: 10, resetTimeoutMs: 60000, halfOpenMaxCalls: 1 });
      const dlq = new DLQRetryHandler({ maxAttempts: 5, baseDelayMs: 100 });
      const resolver = new SyncConflictResolver();
      const stt = new SpeechToTextAdapter();
      const voiceParser = new VoiceQueryParser();

      expect(engine).toBeDefined();
      expect(aggregator).toBeDefined();
      expect(mapper).toBeDefined();
      expect(cb.getState().state).toBe("CLOSED");
      expect(dlq.getAllJobs()).toHaveLength(0);
      expect(resolver).toBeDefined();
      expect(stt).toBeDefined();
      expect(voiceParser).toBeDefined();
    });
  });
});
