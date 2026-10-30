jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: async () => ({
      sid: "sess_admin",
      staffId: "user-admin",
      role: "admin",
      email: "admin@thaiba.edu",
      institutionId: "campus-north",
    }),
    resolveInstitutionScopeForSession: async () => "campus-north",
  };
});

import { POST as voicePOST } from "../query/route";

function createMockRequest(url: string, method: string = "GET", body?: unknown): Request {
  const headers = new Headers();
  headers.set("authorization", "Bearer mock-token");
  headers.set("x-user-role", "admin");

  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("FED-017: Executive Voice Intelligence API Test Suite", () => {
  it("executes voice query intent via POST /api/admin/voice/query", async () => {
    const req = createMockRequest("http://localhost/api/admin/voice/query", "POST", {
      transcriptText: "Show financial operating margin for Campus North",
    });

    const res = await voicePOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.parsedQuery.intent).toBe("GET_FINANCIAL_MARGIN");
    expect(data.parsedQuery.campusId).toBe("campus-north");
    expect(data.parsedQuery.synthesizedAudioText).toBeDefined();
  });

  it("rejects empty or low-confidence audio input", async () => {
    const req = createMockRequest("http://localhost/api/admin/voice/query", "POST", {});

    const res = await voicePOST(req);
    expect(res.status).toBe(422);
  });
});
