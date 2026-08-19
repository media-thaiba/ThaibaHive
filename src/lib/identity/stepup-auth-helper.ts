import { verifySession, verifyStepUpToken } from "@thaiba/auth";

/**
 * Resolves identity for step-up authentication endpoints.
 * Strictly requires either:
 * 1. Active authenticated session cookie
 * 2. Cryptographically verified stepUpToken (signed by canonical JWT secret)
 */
export async function resolveStepUpIdentity(
  request: Request,
  body?: any,
): Promise<{ staffId: string; challengeId?: string; user?: any } | null> {
  // 1. Check existing session cookie
  try {
    const session = await verifySession();
    if (session?.staffId) {
      return { staffId: session.staffId, user: session };
    }
  } catch {
    // No session cookie
  }

  // 2. Check Authorization header or body for cryptographically signed stepUpToken
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : body?.stepUpToken;

  if (token) {
    const verified = await verifyStepUpToken(token);
    if (verified?.staffId) {
      return {
        staffId: verified.staffId,
        challengeId: verified.challengeId,
      };
    }
  }

  // Security: NEVER accept unauthenticated staffId from request parameters
  return null;
}
