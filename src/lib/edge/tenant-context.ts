import { jwtVerify } from "jose";
import { TenantContext } from "./types";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-key-123456");

/**
 * Extracts and verifies tenant context from JWT authentication tokens at the Edge runtime level.
 * Leverages native Web Crypto bindings via 'jose' for sub-millisecond execution.
 */
export async function parseTenantContext(token: string): Promise<TenantContext> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    const tenantId = (payload.tenantId || payload.tenant_id) as string;
    const userId = (payload.userId || payload.staffId || payload.id) as string;
    const role = (payload.role || "staff") as string;
    const permissions = (payload.permissions || []) as string[];

    if (!tenantId || !userId) {
      throw new Error("Missing critical claims (tenantId or userId)");
    }

    return {
      tenantId,
      userId,
      role,
      permissions,
    };
  } catch (error: any) {
    throw new Error(`JWT Verification Failed: ${error.message}`);
  }
}
