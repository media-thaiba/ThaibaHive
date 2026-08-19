import { GET } from "@/app/api/admin/executive/analytics/route";
import {  } from "next/server";

jest.mock("@/lib/api/auth-guard", () => ({
  requireAuth: (handler: any, permission: string) => async (req: any) => {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader === "Bearer forbidden") {
      const { NextResponse } = require("next/server");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(req, { id: "user-1", role: "super_admin" });
  },
}));

describe("MHD-009 & MHD-012: Executive Analytics Aggregation API Endpoint", () => {
  it("returns aggregated analytics payload for authorized super_admin user", async () => {
    const req: any = {
      url: "http://localhost:3000/api/admin/executive/analytics",
      headers: new Headers({ authorization: "Bearer valid-token" }),
    };

    const response = await GET(req);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.governance).toBeDefined();
    expect(json.governance.totalPolicies).toBe(24);
    expect(json.resilience).toBeDefined();
    expect(json.resilience.dlqDepth).toBe(3);
    expect(json.voiceCopilot).toBeDefined();
    expect(json.voiceCopilot.queriesToday).toBe(148);
    expect(json.mobileSyncHealth).toBeDefined();
    expect(json.mobileSyncHealth.syncHealth).toBe("HEALTHY");
  });

  it("rejects unauthorized requests with HTTP 403", async () => {
    const req: any = {
      url: "http://localhost:3000/api/admin/executive/analytics",
      headers: new Headers({ authorization: "Bearer forbidden" }),
    };

    const response = await GET(req);
    expect(response.status).toBe(403);
  });
});
