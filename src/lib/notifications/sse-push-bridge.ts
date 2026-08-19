import { eventBus } from "@/lib/sse/event-bus";
import { PushNotificationService } from "./push-notification-service";

export class SsePushBridge {
  private static initialized = false;
  private static recentEvents = new Set<string>();

  static init() {
    if (this.initialized) return;
    this.initialized = true;

    // Subscribe to governance channel
    eventBus.subscribe("governance", (payload) => {
      this.handleGovernanceEvent(payload);
    });

    // Subscribe to system channel
    eventBus.subscribe("system", (payload) => {
      this.handleSystemEvent(payload);
    });
  }

  private static handleGovernanceEvent(payload: Record<string, unknown>) {
    const eventType = payload.type as string;
    const policyId = payload.policyId as string;

    if (!eventType || !policyId) return;

    const eventKey = `${eventType}_${policyId}`;
    if (this.recentEvents.has(eventKey)) return; // Deduplicate rapid duplicate events

    this.recentEvents.add(eventKey);
    setTimeout(() => this.recentEvents.delete(eventKey), 10000);

    if (eventType === "POLICY_PROPAGATED") {
      PushNotificationService.sendToUser(
        "all_admins",
        "mock_admin_token",
        "android",
        "Policy Updated",
        `Policy ${policyId} has been propagated across institutions.`,
        { type: "POLICY_PROPAGATED", policyId }
      );
    }
  }

  private static handleSystemEvent(payload: Record<string, unknown>) {
    const eventType = payload.type as string;
    if (eventType === "CIRCUIT_BREAKER_STATE_CHANGED") {
      PushNotificationService.sendToUser(
        "super_admin",
        "mock_super_admin_token",
        "android",
        "Governance Alert",
        `Circuit breaker state changed to ${payload.state || "OPEN"}`,
        { type: "CIRCUIT_BREAKER_STATE_CHANGED" }
      );
    }
  }
}
