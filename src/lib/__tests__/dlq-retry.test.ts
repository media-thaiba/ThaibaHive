import { DLQRetryHandler } from "../resilience/dlq-retry-handler";

describe("FED-008: Automatic Dead-Letter Queue (DLQ) Retry & Backoff Handler Test Suite", () => {
  it("enqueues failed jobs with calculated exponential backoff", () => {
    const dlq = new DLQRetryHandler(3);

    const job = dlq.enqueueFailedJob("tenant-alpha", "SMS_DISPATCH", { phone: "+123456" }, "Gateway Timeout");
    expect(job.id).toBeDefined();
    expect(job.attemptCount).toBe(1);
    expect(job.status).toBe("PENDING");
    expect(new Date(job.nextRetryAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("successfully retries failed job and updates status to SUCCESS", async () => {
    const dlq = new DLQRetryHandler(3);
    const job = dlq.enqueueFailedJob("tenant-alpha", "AUDIT_REPLICATION", { eventId: "evt-1" }, "Network error");

    const result = await dlq.processRetryJob(job.id, async (payload) => {
      expect(payload.eventId).toBe("evt-1");
      return true;
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe("SUCCESS");
  });

  it("quarantines job when maximum retry attempts are reached", async () => {
    const dlq = new DLQRetryHandler(2);
    const job = dlq.enqueueFailedJob("tenant-alpha", "WEBHOOK_POST", { url: "http://bad.domain" }, "Connection Refused");

    // Attempt 2 fails (reaching max 2)
    const result = await dlq.processRetryJob(job.id, async () => false);

    expect(result.success).toBe(false);
    expect(result.status).toBe("QUARANTINED");
    expect(result.error).toContain("Max retries");
  });
});
