import * as fs from "fs";
import * as path from "path";

/**
 * Cross-process mutual exclusion for tests that share the single test-staff
 * attendance record for today (attendance.spec, scanners.spec, attendance-workflow.spec).
 *
 * Playwright runs spec files in parallel workers, and those three files each
 * reset/check-in/out the same staff member, so interleaved execution leaves the
 * attendance page in a checked-in state that hides the CheckInPanel and hangs
 * the sibling specs. Each file wraps its lifetime in this lock via beforeAll/afterAll.
 *
 * Uses atomic fs.mkdir as the mutex (valid across processes on Windows and POSIX)
 * plus stale-lock stealing so a crashed worker cannot wedge the suite.
 */

const LOCK_DIR = path.join(process.cwd(), ".auth", ".attendance-state-lock");
const STALE_MS = 120_000;
const ACQUIRE_TIMEOUT_MS = 150_000;

export async function acquireAttendanceStateLock(): Promise<void> {
  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;
  for (;;) {
    try {
      fs.mkdirSync(LOCK_DIR);
      return;
    } catch {
      try {
        if (Date.now() - fs.statSync(LOCK_DIR).mtimeMs > STALE_MS) {
          fs.rmSync(LOCK_DIR, { recursive: true, force: true });
          continue;
        }
      } catch {
        // Lock vanished between mkdir and stat; retry immediately.
      }
      if (Date.now() > deadline) {
        throw new Error("Timed out waiting for shared attendance-state lock (.attendance-state-lock)");
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

export function releaseAttendanceStateLock(): void {
  try {
    fs.rmSync(LOCK_DIR, { recursive: true, force: true });
  } catch {
    // Already released or stolen.
  }
}
