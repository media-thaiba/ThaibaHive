import crypto from "crypto";

/**
 * Shared CSRF test harness for Jest and Playwright E2E suites.
 *
 * The double-submit CSRF pattern uses a non-HttpOnly satellite cookie
 * (`csrf_sat`) readable by client JS. Tests that exercise state-changing
 * routes must set this cookie or the auth guard will reject the request.
 */

export interface CsrfTestHarness {
  token: string;
  cookieHeader: string;
  requestHeaders: Record<string, string>;
  mockCookieStore(): {
    get: (name: string) => { value: string } | null;
    set: ReturnType<typeof jest.fn>;
    delete: ReturnType<typeof jest.fn>;
  };
  playwrightCookie(domain?: string): {
    name: string;
    value: string;
    domain: string;
    path: string;
    httpOnly: false;
    sameSite: "lax";
  };
}

/**
 * Creates a test CSRF harness with a cryptographically secure token.
 * Use in Jest tests that call requireAuth directly or exercise the auth guard.
 */
export function createCsrfTestHarness(): CsrfTestHarness {
  const token = `test_csrf_${crypto.randomBytes(8).toString("hex")}`;

  return {
    token,
    cookieHeader: `csrf_sat=${token}`,
    requestHeaders: { "x-csrf-token": token },

    mockCookieStore() {
      return {
        get: (name: string) => (name === "csrf_sat" ? { value: token } : null),
        set: jest.fn(),
        delete: jest.fn(),
      };
    },

    playwrightCookie(domain: string = "localhost") {
      return {
        name: "csrf_sat",
        value: token,
        domain,
        path: "/",
        httpOnly: false as const,
        sameSite: "lax" as const,
      };
    },
  };
}