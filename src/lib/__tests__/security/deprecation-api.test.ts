/**
 * Unit/Integration tests for Legacy Token Deprecation API (TIF-009 / TD-012)
 */

import { GET, POST } from "../../../app/api/admin/security/identity/deprecation-stats/route";
import { LegacyTokenDeprecationEngine } from "../../identity/legacy-token-deprecation";

describe("Deprecation Stats Admin API (TIF-009)", () => {
  beforeEach(() => {
    LegacyTokenDeprecationEngine.getInstance().setMode("WARN");
  });

  it("returns deprecation metrics via GET handler", async () => {
    const req = new Request("http://localhost/api/admin/security/identity/deprecation-stats", {
      method: "GET",
      headers: {
        "x-user-role": "admin",
        "x-user-id": "admin-1",
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveProperty("mode");
    expect(json).toHaveProperty("sunsetDate");
    expect(json).toHaveProperty("daysUntilSunset");
    expect(json).toHaveProperty("dpopAdoptionPercentage");
    expect(json).toHaveProperty("clientDistribution");
  });

  it("updates deprecation mode via POST handler", async () => {
    const req = new Request("http://localhost/api/admin/security/identity/deprecation-stats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": "super_admin",
        "x-user-id": "superadmin-1",
      },
      body: JSON.stringify({ mode: "SOFT_ENFORCE" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.mode).toBe("SOFT_ENFORCE");
    expect(LegacyTokenDeprecationEngine.getInstance().getMode()).toBe("SOFT_ENFORCE");
  });
});
