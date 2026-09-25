import {
  validatePreflightEnv,
  validateWorkspaceLinks,
  validateBuildArtifact,
} from "../../../scripts/deploy/preflight-core";

describe("deploy preflight (Phase 7 / 7.5)", () => {
  const goodEnv: Record<string, string> = {
    NODE_ENV: "production",
    AUTH_JWT_SECRET: "prod-secret-0123456789abcdefghijklmnopqrstuv",
    HEALTH_SECRET: "health-secret-0123456789abcdef",
    METRICS_SECRET: "metrics-secret-0123456789abcdef",
    DATABASE_URL: "postgresql://user:pass@db:5432/thaibahive",
    NEXT_PUBLIC_APP_URL: "https://thaibahive.example.com",
    PII_ENCRYPTION_KEY: "k",
  };

  it("passes with a valid production env", () => {
    const { passed, checks } = validatePreflightEnv(goodEnv);
    expect(passed).toBe(true);
    expect(checks.every((c) => c.passed)).toBe(true);
  });

  it("fails when AUTH_JWT_SECRET is missing entirely", () => {
    const env = { ...goodEnv };
    delete env.AUTH_JWT_SECRET;
    delete env.JWT_SECRET;
    const { passed, checks } = validatePreflightEnv(env);
    expect(passed).toBe(false);
    const jwt = checks.find((c) => c.name === "JWT signing secret configured (non-empty, >= 16 chars)");
    expect(jwt?.passed).toBe(false);
  });

  it("accepts the deprecated JWT_SECRET alias", () => {
    const env = { ...goodEnv };
    delete env.AUTH_JWT_SECRET;
    env.JWT_SECRET = "legacy-alias-secret-0123456789abcdefgh";
    const { passed } = validatePreflightEnv(env);
    expect(passed).toBe(true);
  });

  it("fails on a dev/CI placeholder secret in production", () => {
    const env = {
      ...goodEnv,
      AUTH_JWT_SECRET: "dev-jwt-secret-min-32-chars-long-security-key-thaibahive",
    };
    const { passed, checks } = validatePreflightEnv(env);
    expect(passed).toBe(false);
    const found = checks.find((c) => c.name === "No dev/CI placeholder secret used in production");
    expect(found?.passed).toBe(false);
  });

  it("fails on weak shared secrets (HEALTH/METRICS < 16 chars)", () => {
    const env = { ...goodEnv, HEALTH_SECRET: "short", METRICS_SECRET: "tiny" };
    const { passed, checks } = validatePreflightEnv(env);
    expect(passed).toBe(false);
    const schema = checks.find((c) => c.name === "Environment schema validity");
    expect(schema?.passed).toBe(false);
    expect(schema?.detail).toContain("HEALTH_SECRET");
    expect(schema?.detail).toContain("METRICS_SECRET");
  });

  it("fails on an invalid NEXT_PUBLIC_APP_URL", () => {
    const env = { ...goodEnv, NEXT_PUBLIC_APP_URL: "not-a-url" };
    const { passed, checks } = validatePreflightEnv(env);
    expect(passed).toBe(false);
    const url = checks.find((c) => c.name === "NEXT_PUBLIC_APP_URL is a valid http(s) URL");
    expect(url?.passed).toBe(false);
  });

  it("workspace links gate reports existence without throwing", () => {
    const { passed, checks } = validateWorkspaceLinks();
    expect(checks).toHaveLength(2);
    expect(checks.every((c) => c.gate === "WORKSPACE")).toBe(true);
    expect(passed).toEqual(expect.any(Boolean));
  });

  it("build artifact gate reports existence without throwing", () => {
    const { passed, checks } = validateBuildArtifact();
    expect(checks).toHaveLength(1);
    expect(checks[0]?.gate).toBe("BUILD");
    expect(passed).toEqual(expect.any(Boolean));
  });
});