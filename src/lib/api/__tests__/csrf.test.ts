import { detectAuthTransport, isCsrfVulnerable, validateCsrf, CSRF_SAT_COOKIE, CSRF_TOKEN_HEADER } from "../csrf";

describe("CSRF Protection Layer", () => {
  it("detects Bearer authentication transport", () => {
    const req = new Request("https://thaibahive.internal/api/students", {
      method: "POST",
      headers: {
        authorization: "Bearer test-token-12345",
      },
    });
    expect(detectAuthTransport(req)).toBe("bearer");
    expect(isCsrfVulnerable(req)).toBe(false);
  });

  it("detects DPoP authentication transport", () => {
    const req = new Request("https://thaibahive.internal/api/students", {
      method: "POST",
      headers: {
        authorization: "Bearer test-dpop-token",
        "dpop-proof": "eyJhbGciOiJFUzI1NiJ9...",
      },
    });
    expect(detectAuthTransport(req)).toBe("dpop");
    expect(isCsrfVulnerable(req)).toBe(false);
  });

  it("detects cookie-based authentication transport", () => {
    const req = new Request("https://thaibahive.internal/api/students", {
      method: "POST",
      headers: {
        cookie: "thaibahive_session=session-token-xyz;",
      },
    });
    expect(detectAuthTransport(req)).toBe("cookie");
    expect(isCsrfVulnerable(req)).toBe(true);
  });

  it("allows safe HTTP methods (GET, HEAD, OPTIONS) without token", async () => {
    const getReq = new Request("https://thaibahive.internal/api/students", {
      method: "GET",
      headers: { cookie: "thaibahive_session=session-token-xyz;" },
    });
    expect(await validateCsrf(getReq)).toBe(true);

    const optionsReq = new Request("https://thaibahive.internal/api/students", {
      method: "OPTIONS",
      headers: { cookie: "thaibahive_session=session-token-xyz;" },
    });
    expect(await validateCsrf(optionsReq)).toBe(true);
  });

  it("bypasses CSRF validation for Bearer token POST requests", async () => {
    const bearerReq = new Request("https://thaibahive.internal/api/students", {
      method: "POST",
      headers: {
        authorization: "Bearer mobile-app-token",
      },
    });
    expect(await validateCsrf(bearerReq)).toBe(true);
  });

  it("blocks cookie-based POST request missing x-csrf-token header", async () => {
    const cookieReq = new Request("https://thaibahive.internal/api/students", {
      method: "POST",
      headers: {
        cookie: `thaibahive_session=session-token; ${CSRF_SAT_COOKIE}=valid-csrf-token`,
      },
    });
    expect(await validateCsrf(cookieReq)).toBe(false);
  });

  it("blocks cookie-based POST request with mismatched x-csrf-token header", async () => {
    const cookieReq = new Request("https://thaibahive.internal/api/students", {
      method: "POST",
      headers: {
        cookie: `thaibahive_session=session-token; ${CSRF_SAT_COOKIE}=valid-csrf-token`,
        [CSRF_TOKEN_HEADER]: "attacker-manipulated-token",
      },
    });
    expect(await validateCsrf(cookieReq)).toBe(false);
  });

  it("permits cookie-based POST request with matching x-csrf-token header", async () => {
    const token = "super-secret-csrf-token-12345678";
    const cookieReq = new Request("https://thaibahive.internal/api/students", {
      method: "POST",
      headers: {
        cookie: `thaibahive_session=session-token; ${CSRF_SAT_COOKIE}=${token}`,
        [CSRF_TOKEN_HEADER]: token,
      },
    });
    expect(await validateCsrf(cookieReq)).toBe(true);
  });
});
