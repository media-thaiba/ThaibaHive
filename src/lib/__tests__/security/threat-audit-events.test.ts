/**
 * Unit Tests for Threat Audit Events Integration
 * Sprint-038 / AGS-015
 */

import { logGatewayThreatEvent } from "../../security/threat-audit-events";
import { cryptoAuditWriter } from "../../audit/crypto-writer";

jest.mock("../../audit/crypto-writer", () => ({
  cryptoAuditWriter: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("Gateway Threat Audit Logging (AGS-015)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should log quarantine events to the crypto audit writer", async () => {
    await logGatewayThreatEvent({
      eventType: "gateway.ip.quarantined",
      ipAddress: "203.0.113.99",
      reason: "Automated threat heuristic ban",
      threatScore: 95,
      cidrMask: "/32",
    });

    expect(cryptoAuditWriter.log).toHaveBeenCalledTimes(1);
    expect(cryptoAuditWriter.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "GATEWAY_IP_QUARANTINED",
        entityType: "GATEWAY_SECURITY",
        entityId: "203.0.113.99",
      })
    );
  });

  it("should log circuit breaker tripped event", async () => {
    await logGatewayThreatEvent({
      eventType: "gateway.circuit.tripped",
      circuitState: "OPEN",
      reason: "Canary p95 latency exceeded 200ms",
    });

    expect(cryptoAuditWriter.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "GATEWAY_CIRCUIT_TRIPPED",
        payload: expect.objectContaining({
          circuitState: "OPEN",
        }),
      })
    );
  });
});
