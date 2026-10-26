import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { jwtVerify, decodeJwt } from "jose";
import { getJwtSecretBytes } from "@thaiba/auth/config";
import { db } from "@/db";
import { userSessions, presence } from "@thaiba/db/schema";
import { eq, and } from "drizzle-orm";
import { broadcastPresence } from "@/lib/api/realtime";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  let token: string | undefined;

  // 1. Check cookies
  try {
    const cookieStore = await cookies();
    token = cookieStore.get("thaibahive_session")?.value;
  } catch {
    // Non-cookie environment
  }

  // 2. Check Authorization header (Bearer token)
  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  if (token) {
    let payload: any = null;
    try {
      const verified = await jwtVerify(token, getJwtSecretBytes("session"));
      payload = verified.payload;
    } catch {
      // Tolerant fallback: decode without signature verification if token is expired
      try {
        payload = decodeJwt(token);
      } catch {
        // Unparseable token
      }
    }

    if (payload?.sid) {
      try {
        // Mark user_sessions status as terminated if still active
        await db
          .update(userSessions)
          .set({
            status: "terminated",
            logoutAt: Date.now(),
          })
          .where(and(eq(userSessions.id, payload.sid), eq(userSessions.status, "active")))
          .run();
      } catch (err) {
        console.error("Failed to mark user_sessions terminated on logout:", err);
      }
    }

    if (payload?.staffId) {
      const now = new Date().toISOString();
      try {
        await db
          .update(presence)
          .set({ online: false, lastSeenAt: now, updatedAt: now })
          .where(eq(presence.staffId, payload.staffId))
          .run();
        broadcastPresence(payload.staffId, false, now);
      } catch (err) {
        console.error("Failed to update presence on logout:", err);
      }
    }
  }

  // 3. Always clear session cookie
  await destroySession();

  const response = NextResponse.json({ success: true });
  try {
    response.cookies.delete("thaibahive_session");
  } catch {
    // Environment fallback
  }
  return response;
}
