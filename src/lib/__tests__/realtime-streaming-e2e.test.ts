

import { defaultStreamingService } from "../realtime/realtime-streaming-service";
import { RedisClusterManager } from "../redis/redis-cluster-manager";
import {  } from "../triggers/trigger-evaluation-engine";
import {  } from "../notifications/automated-notification-router";
import { RemediationTriggerBridge } from "../triggers/remediation-trigger-bridge";
import { StudentRetentionPredictor } from "../predictive/student-retention-predictor";
import { EnrollmentForecastingEngine } from "../predictive/enrollment-forecasting-engine";
import { BudgetScenarioSimulator } from "../simulation/budget-scenario-simulator";

describe("STREAM-020: Sprint-012 End-to-End Real-Time Event-Driven Streaming Test Suite", () => {
  it("executes the full end-to-end event-driven streaming and predictive allocation lifecycle", async () => {
    // 1. Redis Cluster Key Sharding setup
    const clusterManager = new RedisClusterManager();
    const shardedKey = clusterManager.getShardedKey("tenant-e2e", "stream", "session_100");
    expect(shardedKey).toBe("thaiba:{tenant-e2e}:stream:session_100");

    // 2. Real-Time Streaming Session Initialization
    const streamService = defaultStreamingService;
    const session = streamService.createSession("tenant-e2e", "user-admin", "sse", ["copilot_feed", "risk_alerts"]);
    expect(session.status).toBe("active");

    // 3. Trigger Evaluation & Anomaly Remediation Bridge
    const bridge = new RemediationTriggerBridge();
    const remediationRes = await bridge.processAnomalyAndDispatch("tenant-e2e", {
      type: "absenteeism",
      studentId: "std_e2e_01",
      studentName: "E2E Student",
      consecutiveDaysAbsent: 4,
      parentPhone: "+15559990000",
    });

    expect(remediationRes.evaluated).toBe(true);
    expect(remediationRes.dispatched).toBe(true);

    // 4. Verify Stream Event Frame Replay
    const streamEvents = streamService.getReplayEvents("tenant-e2e", "risk_alerts");
    expect(streamEvents.length).toBeGreaterThan(0);
    expect(streamEvents[0].eventType).toBe("automated_intervention_dispatched");

    // 5. Student Retention Predictive Inference
    const predictor = new StudentRetentionPredictor();
    const retentionRes = predictor.predictRetentionRisk({
      studentId: "std_e2e_01",
      studentName: "E2E Student",
      campusId: "inst-001",
      absenteeismRatePct: 28.0,
      gradeDropPct: 18.0,
      feeDelayDays: 40,
    });
    expect(retentionRes.riskCategory).toBe("HIGH");

    // 6. Multi-Campus Enrollment Forecasting
    const forecaster = new EnrollmentForecastingEngine();
    const forecast = forecaster.forecastCampus({
      campusId: "inst-001",
      campusName: "Main Campus",
      capacityLimit: 1000,
      currentEnrollment: 920,
      historicalEnrollments: [
        { year: "2024", count: 820 },
        { year: "2025", count: 870 },
        { year: "2026", count: 920 },
      ],
    });
    expect(forecast.isBottleneckRisk).toBe(true);

    // 7. Interactive "What-If" Budget Scenario Simulation
    const simulator = new BudgetScenarioSimulator();
    const simResult = simulator.simulateScenario({
      scenarioName: "E2E Capacity Expansion Scenario",
      staffCostDelta: 30000,
      tuitionFeeDelta: 500,
      facilityBudgetDelta: 15000,
    });

    expect(simResult.executionTimeMs).toBeLessThan(100);
    expect(simResult.campusBreakdowns.length).toBeGreaterThan(0);
  });
});
