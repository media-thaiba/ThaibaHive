import { runScan, scanRouteSource, ALLOW_LIST } from "../../../scripts/security/ast-tenant-scan";

describe("B8 Tenant Parameter Isolation Regression Guard (AST Handler-Level Call Scanner)", () => {
  it("fails if any API route handler reads institutionId/tenantId without calling a resolver inside that same handler", () => {
    const allowlistCount = Object.keys(ALLOW_LIST).length;
    console.log(`Allowlist size: ${allowlistCount}`);
    for (const [key, reason] of Object.entries(ALLOW_LIST)) {
      console.log(`  [ALLOWLIST] ${key} => ${reason}`);
    }

    const violations = runScan("src/app/api");

    if (violations.length > 0) {
      const formatted = violations
        .map((v) => `  - [${v.method}] ${v.file}${v.handlerName ? ` (handler: ${v.handlerName})` : ""}: ${v.reasons.join(", ")}`)
        .join("\n");
      throw new Error(
        `B8 Handler-Level Tenant Bypass Violation: The following ${violations.length} handlers read client-supplied tenant parameters without calling a resolver inside the handler:\n${formatted}`
      );
    }

    expect(violations).toHaveLength(0);
    expect(allowlistCount).toBe(4);
  });

  it("detects unshielded tenant parameter in separated function declaration", () => {
    const mockCode = `
      import { NextResponse } from "next/server";
      import { requireAuth } from "@/lib/auth/require-auth";

      async function getHandler(req: Request) {
        const { searchParams } = new URL(req.url);
        const tenantId = searchParams.get("tenantId");
        return NextResponse.json({ tenantId });
      }

      export const GET = requireAuth(getHandler, "system:read");
    `;

    const findings = scanRouteSource("src/app/api/mock/route.ts", mockCode);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].handlerName).toBe("getHandler");
    expect(findings[0].reasons[0]).toContain("Reads query tenant/institution parameter without calling resolver");
  });

  it("detects unshielded alternative parameter names (campusId, branchId, institution_id)", () => {
    const mockCode = `
      import { NextResponse } from "next/server";
      import { requireAuth } from "@/lib/auth/require-auth";

      export const POST = requireAuth(async (req: Request) => {
        const body = await req.json();
        const campusId = body.campusId;
        return NextResponse.json({ campusId });
      }, "system:manage");
    `;

    const findings = scanRouteSource("src/app/api/mock/route.ts", mockCode);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].reasons[0]).toContain("Reads body/parsed tenant/institution parameter without calling resolver");
  });
});
