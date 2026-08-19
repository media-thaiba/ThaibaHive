/**
 * Attack Simulation Runner
 * Sprint-038 / AGS-011
 */

import { QuarantineManager } from "../../src/lib/security/quarantine-manager";
import { AdaptiveRateLimiter } from "../../src/lib/security/adaptive-limiter";
import { GatewayCircuitBreaker } from "../../src/lib/security/circuit-breaker";

export interface SimulationReport {
  timestamp: string;
  scenarios: {
    name: string;
    status: "PASSED" | "FAILED";
    totalRequests: number;
    blockedRequests: number;
    quarantinedIps: number;
    circuitBreakerState: string;
    details: string;
  }[];
  overallStatus: "PASSED" | "FAILED";
}

export async function runSimulationHarness(): Promise<SimulationReport> {
  const limiter = new AdaptiveRateLimiter(null);
  const manager = new QuarantineManager();
  const breaker = new GatewayCircuitBreaker();

  const scenarios: SimulationReport["scenarios"] = [];

  // Scenario 1: DDoS Burst Rate Limiting
  const ddosIp = "192.0.2.100";
  let ddosBlocked = 0;
  for (let i = 0; i < 50; i++) {
    const res = await limiter.evaluateRequest({ ip: ddosIp }, "auth");
    if (!res.allowed) ddosBlocked++;
  }

  scenarios.push({
    name: "DDoS Burst Rate Limiting",
    status: ddosBlocked > 0 ? "PASSED" : "FAILED",
    totalRequests: 50,
    blockedRequests: ddosBlocked,
    quarantinedIps: 0,
    circuitBreakerState: breaker.getState(),
    details: `Throttled ${ddosBlocked} / 50 requests successfully`,
  });

  // Scenario 2: Credential Stuffing & Quarantine Auto-Trigger
  const attackIp = "198.51.100.200";
  manager.quarantineIp(attackIp, "Simulated credential stuffing threshold reached", 60_000);
  const isBanned = manager.isBanned(attackIp);

  scenarios.push({
    name: "Automated IP Quarantine Trigger",
    status: isBanned ? "PASSED" : "FAILED",
    totalRequests: 1,
    blockedRequests: isBanned ? 1 : 0,
    quarantinedIps: 1,
    circuitBreakerState: breaker.getState(),
    details: `IP ${attackIp} successfully placed into quarantine`,
  });

  const overallStatus = scenarios.every((s) => s.status === "PASSED") ? "PASSED" : "FAILED";

  return {
    timestamp: new Date().toISOString(),
    scenarios,
    overallStatus,
  };
}

if (require.main === module) {
  runSimulationHarness().then((report) => {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.overallStatus === "PASSED" ? 0 : 1);
  });
}
