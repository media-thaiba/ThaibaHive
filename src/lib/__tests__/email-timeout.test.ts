/**
 * Item 2 — Resend email hard timeout (8000ms).
 *
 * The Resend SDK is mocked at module scope so a deliberately hanging transport
 * can be exercised deterministically with no network access.
 */

const mockSend = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: (payload: unknown) => mockSend(payload),
    },
  })),
}));

import { RESEND_HARD_TIMEOUT_MS, sendVerificationEmail, sendPasswordResetEmail, sendStepUpOTPEmail } from "@/lib/email";

describe("Resend email hard timeout (8000ms)", () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalVercelEnv = process.env.VERCEL_ENV;

  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test_key_item2";
    delete process.env.VERCEL_ENV;
    mockSend.mockReset();
  });

  afterAll(() => {
    if (originalApiKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalApiKey;
    }
    if (originalVercelEnv === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = originalVercelEnv;
    }
  });

  test("hard-hanging Resend resolves to { success:false, status:'unknown' } within 8s without throwing and logs structured JSON without recipient address", async () => {
    expect(RESEND_HARD_TIMEOUT_MS).toBe(8000);

    const stderrWrites: string[] = [];
    const originalStderrWrite = process.stderr.write;
    process.stderr.write = ((chunk: any) => {
      stderrWrites.push(String(chunk));
      return true;
    }) as any;

    const unhandled: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      // The transport never settles: only the 8s race can end this call.
      mockSend.mockImplementation(() => new Promise(() => undefined));

      const startedAt = Date.now();
      const recipient = "user_pii_secret@example.com";
      const result = await sendVerificationEmail(
        recipient,
        "Ada",
        "https://example.com/verify"
      );
      const elapsedMs = Date.now() - startedAt;

      expect(result).toEqual({
        success: false,
        status: "unknown",
        error: "Resend email delivery timed out after 8000ms",
      });
      expect(elapsedMs).toBeGreaterThanOrEqual(7900);
      expect(elapsedMs).toBeLessThan(8500);

      // Verify structured JSON event logged to stderr
      const timeoutLog = stderrWrites.find((w) => w.includes("resend_timeout"));
      expect(timeoutLog).toBeDefined();
      const parsed = JSON.parse(timeoutLog!);
      expect(parsed.event).toBe("resend_timeout");
      expect(parsed.kind).toBe("verification");
      expect(parsed.timeoutMs).toBe(8000);

      // PII assertion: recipient address must never appear anywhere in stderr
      stderrWrites.forEach((line) => {
        expect(line).not.toContain(recipient);
        expect(line).not.toContain("user_pii_secret");
      });

      // Give any late-settling transport promise a chance to surface before
      // asserting that nothing escaped as an unhandled rejection.
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(unhandled).toEqual([]);
    } finally {
      process.stderr.write = originalStderrWrite;
      process.on("unhandledRejection", onUnhandledRejection);
    }
  }, 20000);

  test("a fast successful send resolves { success:true, status:'sent' }", async () => {
    mockSend.mockResolvedValue({ id: "email-id-1" });

    const result = await sendVerificationEmail(
      "user@example.com",
      "Ada",
      "https://example.com/verify"
    );

    expect(result).toEqual({ success: true, status: "sent" });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test("a non-timeout Resend failure keeps the existing failed contract", async () => {
    mockSend.mockRejectedValue(new Error("Resend API 500"));

    const result = await sendVerificationEmail(
      "user@example.com",
      "Ada",
      "https://example.com/verify"
    );

    expect(result).toEqual({
      success: false,
      status: "failed",
      error: "Failed to send email",
    });
  });

  test("Resend SDK resolving with API error payload maps to failed status", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { message: "Domain not verified", name: "validation_error" },
    });

    const result = await sendVerificationEmail(
      "user@example.com",
      "Ada",
      "https://example.com/verify"
    );

    expect(result).toEqual({
      success: false,
      status: "failed",
      error: "Domain not verified",
    });
  });

  test("unconfigured RESEND_API_KEY short-circuits as sent in non-production environments", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.VERCEL_ENV;

    const result = await sendVerificationEmail(
      "user@example.com",
      "Ada",
      "https://example.com/verify"
    );

    expect(result).toEqual({ success: true, status: "sent" });
    expect(mockSend).not.toHaveBeenCalled();
  });

  test("unconfigured RESEND_API_KEY returns failed when VERCEL_ENV === 'production'", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.VERCEL_ENV = "production";

    const result = await sendVerificationEmail(
      "user@example.com",
      "Ada",
      "https://example.com/verify"
    );

    expect(result).toEqual({
      success: false,
      status: "failed",
      error: "Email delivery unconfigured: RESEND_API_KEY missing in production",
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  test("late rejection from the losing promise causes no unhandledRejection", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => { unhandled.push(reason); };
    process.on("unhandledRejection", onUnhandled);

    try {
      mockSend.mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error("Late network drop")), 8100))
      );

      const result = await sendVerificationEmail(
        "user@example.com",
        "Ada",
        "https://example.com/verify"
      );

      expect(result.status).toBe("unknown");

      // Wait past the 8100ms mark to verify the rejection was swallowed
      await new Promise((r) => setTimeout(r, 300));
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  }, 20000);
});
