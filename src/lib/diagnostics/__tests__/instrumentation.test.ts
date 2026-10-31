import { spawnSync } from "child_process";
import path from "path";

describe("Process Error Boundary (src/instrumentation.ts)", () => {
  const nodeExe = process.execPath;
  const tsxCli = path.resolve(process.cwd(), "node_modules/tsx/dist/cli.mjs");

  test("unhandledRejection writes structured JSON line to stderr and leaves process alive", () => {
    const fixturePath = path.resolve(__dirname, "fixtures/unhandled-rejection-runner.ts");

    const res = spawnSync(nodeExe, [tsxCli, fixturePath], {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 15000,
    });

    expect(res.status).toBe(0);
    expect(res.stdout).toContain("PROCESS_SURVIVED");

    // Verify structured JSON on stderr
    const stderrLines = res.stderr.split("\n").map(s => s.trim()).filter(Boolean);
    const rejectionLine = stderrLines.find((l) => l.includes("unhandled_rejection"));
    expect(rejectionLine).toBeDefined();

    const parsed = JSON.parse(rejectionLine!);
    expect(parsed.event).toBe("unhandled_rejection");
    expect(parsed.message).toBe("Test unhandled rejection payload");
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.stack).toBeDefined();
  });

  test("uncaughtExceptionMonitor captures diagnostic and allows Node default exit 1", () => {
    const fixturePath = path.resolve(__dirname, "fixtures/uncaught-exception-runner.ts");

    const res = spawnSync(nodeExe, [tsxCli, fixturePath], {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 15000,
    });

    // Node default crash exit code is 1
    expect(res.status).toBe(1);

    const stderrLines = res.stderr.split("\n").map(s => s.trim()).filter(Boolean);
    const uncaughtLine = stderrLines.find((l) => l.includes("uncaught_exception"));
    expect(uncaughtLine).toBeDefined();

    const parsed = JSON.parse(uncaughtLine!);
    expect(parsed.event).toBe("uncaught_exception");
    expect(parsed.message).toBe("Fatal uncaught exception test");
    expect(parsed.origin).toBe("uncaughtException");
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.stack).toBeDefined();
  });

  test("PII sanitization strips SQL parameter dumps across entire line (message and stack)", () => {
    const fixturePath = path.resolve(__dirname, "fixtures/pii-sanitization-runner.ts");

    const res = spawnSync(nodeExe, [tsxCli, fixturePath], {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 15000,
    });

    expect(res.status).toBe(0);
    expect(res.stdout).toContain("PII_TEST_DONE");

    const stderrLines = res.stderr.split("\n").map(s => s.trim()).filter(Boolean);
    const rejectionLine = stderrLines.find((l) => l.includes("unhandled_rejection"));
    expect(rejectionLine).toBeDefined();

    // STRICT CHECK: The entire raw stderr line must NOT contain raw user email or tokens
    expect(rejectionLine).not.toContain("secret_user@example.com");
    expect(rejectionLine).not.toContain("super_secret_jwt_token");

    const parsed = JSON.parse(rejectionLine!);
    expect(parsed.message).toContain("Failed query: [REDACTED]");
    expect(parsed.message).toContain("params: [REDACTED]");
    expect(parsed.code).toBe("23505");
    // Stack must only contain call frames ("at ..."), never the error message header
    if (parsed.stack) {
      expect(parsed.stack).not.toContain("secret_user@example.com");
      expect(parsed.stack).toMatch(/^at /);
    }
  });

  test("Idempotency: calling register() multiple times does not duplicate listeners", () => {
    const fixturePath = path.resolve(__dirname, "fixtures/double-register-runner.ts");

    const res = spawnSync(nodeExe, [tsxCli, fixturePath], {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 15000,
    });

    expect(res.status).toBe(0);
    const lines = res.stdout.split("\n").map(l => l.trim()).filter(Boolean);
    const jsonLine = lines.find(l => l.startsWith("{"));
    const output = JSON.parse(jsonLine!);
    expect(output.rejectionAdded).toBe(1);
    expect(output.monitorAdded).toBe(1);
    expect(output.rejectionUnchangedOnSecond).toBe(true);
    expect(output.monitorUnchangedOnSecond).toBe(true);
  });

  test("Production env validation failure causes register() to reject", () => {
    const fixturePath = path.resolve(__dirname, "fixtures/validation-fail-runner.ts");

    const res = spawnSync(nodeExe, [tsxCli, fixturePath], {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 15000,
    });

    // Our runner exits with 42 upon expected rejection
    expect(res.status).toBe(42);
    expect(res.stdout).toContain("EXPECTED_VALIDATION_REJECTION");
    expect(res.stderr).not.toContain("UNEXPECTED_RESOLVE");
  });

  test("Build phase: register() skips revocation mesh and completes cleanly", () => {
    const fixturePath = path.resolve(__dirname, "fixtures/build-phase-runner.ts");

    const res = spawnSync(nodeExe, [tsxCli, fixturePath], {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 15000,
    });

    expect(res.status).toBe(0);
    expect(res.stdout).toContain("BUILD_PHASE_REGISTER_RETURNED_CLEANLY");
    // Assert stderr lacks BOTH revocation_mesh_init_failed AND tripwire FATAL_TEST_ERROR
    expect(res.stderr).not.toContain("revocation_mesh_init_failed");
    expect(res.stderr).not.toContain("FATAL_TEST_ERROR");
  });

  test("Runtime mesh failure: register() resolves cleanly and logs structured failure to stderr", () => {
    const fixturePath = path.resolve(__dirname, "fixtures/runtime-mesh-failure-runner.ts");

    const res = spawnSync(nodeExe, [tsxCli, fixturePath], {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 15000,
    });

    expect(res.status).toBe(0);
    expect(res.stdout).toContain("RUNTIME_REGISTER_RESOLVED");

    const stderrLines = res.stderr.split("\n").map(s => s.trim()).filter(Boolean);
    const meshLine = stderrLines.find((l) => l.includes("revocation_mesh_init_failed"));
    expect(meshLine).toBeDefined();

    const parsed = JSON.parse(meshLine!);
    expect(parsed.event).toBe("revocation_mesh_init_failed");
    expect(parsed.timestamp).toBeDefined();
  });

  test("Sentry integration: pre-cached captureException forwards sanitized error when configured", () => {
    const fixturePath = path.resolve(__dirname, "fixtures/sentry-capture-runner.ts");

    const res = spawnSync(nodeExe, [tsxCli, fixturePath], {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 15000,
    });

    expect(res.status).toBe(0);
    expect(res.stdout).toContain("SENTRY_TEST_COMPLETED");

    // Assert that the entire stderr (including Sentry output) is completely free of PII
    expect(res.stderr).not.toContain("secret_user@example.com");
    expect(res.stderr).not.toContain("super_secret_jwt_token");

    const stderrLines = res.stderr.split("\n").map(s => s.trim()).filter(Boolean);
    const sentryLine = stderrLines.find((l) => l.includes("sentry_exception_captured"));
    expect(sentryLine).toBeDefined();

    const parsed = JSON.parse(sentryLine!);
    expect(parsed.event).toBe("sentry_exception_captured");
    expect(parsed.error).toContain("Failed query: [REDACTED]");
    expect(parsed.context?.origin).toBe("unhandledRejection");
  });

  test("Opt-in container with EXIT_ON_UNHANDLED_REJECTION=1: unhandledRejection terminates process with exit 1", () => {
    const fixturePath = path.resolve(__dirname, "fixtures/prod-non-vercel-rejection-runner.ts");

    const res = spawnSync(nodeExe, [tsxCli, fixturePath], {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 15000,
    });

    // Must exit with code 1
    expect(res.status).toBe(1);
    expect(res.stdout).not.toContain("UNEXPECTED_SURVIVAL");

    const stderrLines = res.stderr.split("\n").map(s => s.trim()).filter(Boolean);
    const rejectionLine = stderrLines.find((l) => l.includes("unhandled_rejection"));
    expect(rejectionLine).toBeDefined();

    const parsed = JSON.parse(rejectionLine!);
    expect(parsed.event).toBe("unhandled_rejection");
    expect(parsed.message).toBe("Opt-in container unhandled rejection");
  });

  test("Default environment without EXIT_ON_UNHANDLED_REJECTION: unhandledRejection keeps process alive", () => {
    const fixturePath = path.resolve(__dirname, "fixtures/prod-vercel-rejection-runner.ts");

    const res = spawnSync(nodeExe, [tsxCli, fixturePath], {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 15000,
    });

    expect(res.status).toBe(0);
    expect(res.stdout).toContain("PROCESS_SURVIVED_DEFAULT");

    const stderrLines = res.stderr.split("\n").map(s => s.trim()).filter(Boolean);
    const rejectionLine = stderrLines.find((l) => l.includes("unhandled_rejection"));
    expect(rejectionLine).toBeDefined();

    const parsed = JSON.parse(rejectionLine!);
    expect(parsed.event).toBe("unhandled_rejection");
    expect(parsed.message).toBe("Default unhandled rejection leaves process alive");
  });
});
