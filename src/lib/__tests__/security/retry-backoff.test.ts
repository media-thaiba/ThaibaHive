/**
 * Unit tests for Exponential Jittered Retry Backoff (TIF-005 / TD-015)
 */

import { withRetry } from "../../security/retry-backoff";

describe("withRetry (TIF-005)", () => {
  it("resolves on immediate first-try success", async () => {
    const fn = jest.fn(async () => "success");
    const res = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 });
    expect(res).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on transient failure and succeeds eventually", async () => {
    let callCount = 0;
    const fn = jest.fn(async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error("transient timeout");
      }
      return "recovered";
    });

    const onRetry = jest.fn();
    const res = await withRetry(fn, {
      maxAttempts: 5,
      baseDelayMs: 1,
      maxDelayMs: 10,
      onRetry,
    });

    expect(res).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting max attempts", async () => {
    const fn = jest.fn(async () => {
      throw new Error("persistent failure");
    });

    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 })
    ).rejects.toThrow("persistent failure");

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("fails immediately on non-retryable 4xx client errors", async () => {
    const fn = jest.fn(async () => {
      const err = new Error("Invalid request");
      (err as any).status = 400;
      throw err;
    });

    await expect(
      withRetry(fn, { maxAttempts: 5, baseDelayMs: 1 })
    ).rejects.toThrow("Invalid request");

    expect(fn).toHaveBeenCalledTimes(1); // Did not retry
  });
});
