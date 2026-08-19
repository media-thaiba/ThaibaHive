import { VoiceIntentMapper } from "../voice/intent-mapper";
import { DiagnosticsHandler } from "../voice/diagnostics-handler";
import { VoiceFeedbackLoop } from "../voice/feedback-loop";
import { db } from "@thaiba/db";
import { clusterNodes } from "@thaiba/db/schema";

describe("Voice Copilot Extensions Test Suite", () => {
  beforeEach(async () => {
    VoiceFeedbackLoop.getInstance().clear();
    await db.delete(clusterNodes).run();

    await db
      .insert(clusterNodes)
      .values([
        {
          id: "node-1",
          nodeId: "primary-db",
          role: "PRIMARY",
          endpoint: "postgresql://primary.local",
          isHealthy: true,
          replicationLagMs: 0,
        },
      ])
      .run();
  });

  afterEach(() => {
    VoiceFeedbackLoop.getInstance().clear();
  });

  test("VoiceIntentMapper - maps voice transcript to structured intents", () => {
    const mapper = new VoiceIntentMapper();

    const checkDb = mapper.mapTranscript("Please check the database health right now");
    expect(checkDb.intent).toBe("check_db_health");

    const failover = mapper.mapTranscript("Trigger failover on node standby-1");
    expect(failover.intent).toBe("trigger_failover");
    expect(failover.params.nodeId).toBe("standby-1");

    const scale = mapper.mapTranscript("scale connection pool main-pool up");
    expect(scale.intent).toBe("scale_pool");
    expect(scale.params.poolName).toBe("main-pool");
    expect(scale.params.action).toBe("up");

    const restart = mapper.mapTranscript("restart video stream 101");
    expect(restart.intent).toBe("restart_stream");
    expect(restart.params.streamId).toBe("101");
  });

  test("DiagnosticsHandler - executes diagnostics report queries", async () => {
    const mapper = new VoiceIntentMapper();
    const handler = new DiagnosticsHandler();

    const checkDbIntent = mapper.mapTranscript("check db status");
    const dbReport = await handler.executeDiagnostics(checkDbIntent);

    expect(dbReport.success).toBe(true);
    expect(dbReport.statusText).toContain("operational");
    expect(dbReport.metrics.primaryNode).toBe("primary-db");
    expect(dbReport.metrics.standbysCount).toBe(0);

    const restartStreamIntent = mapper.mapTranscript("restart stream-node-2");
    const streamReport = await handler.executeDiagnostics(restartStreamIntent);

    expect(streamReport.success).toBe(true);
    expect(streamReport.metrics.streamId).toBe("stream-node-2");
  });

  test("VoiceFeedbackLoop - two-step confirmations, approvals, and timeouts", async () => {
    const loop = VoiceFeedbackLoop.getInstance();

    // 1. Approved case
    const request1 = await loop.requestConfirmation("trigger_failover", { nodeId: "primary-db" });
    expect(request1.prompt).toContain("trigger failover");

    loop.handleResponse(request1.id, "confirm failover");
    const confirmed1 = await request1.confirmationPromise;
    expect(confirmed1).toBe(true);

    // 2. Denied case
    const request2 = await loop.requestConfirmation("restart_stream", { streamId: "101" });
    loop.handleResponse(request2.id, "no, abort it");
    const confirmed2 = await request2.confirmationPromise;
    expect(confirmed2).toBe(false);

    // 3. Timeout case (use jest timers or fake delay)
    jest.useFakeTimers();
    const request3Promise = loop.requestConfirmation("scale_pool", { poolName: "primary-pool" });
    
    // Fast forward 10 seconds (10000ms)
    jest.advanceTimersByTime(10000);
    
    const request3 = await request3Promise;
    const confirmed3 = await request3.confirmationPromise;
    expect(confirmed3).toBe(false);
    
    jest.useRealTimers();
  });
});
