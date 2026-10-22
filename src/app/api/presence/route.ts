import { requireAuth } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { presence, staff } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async () => {
  const rows = await db
    .select({
      staffId: presence.staffId,
      online: presence.online,
      lastSeenAt: presence.lastSeenAt,
      status: presence.status,
      statusText: presence.statusText,
      expiresAt: presence.expiresAt,
      firstName: staff.firstName,
      lastName: staff.lastName,
      avatarUrl: staff.avatarUrl,
    })
    .from(presence)
    .innerJoin(staff, eq(presence.staffId, staff.id))
    .all();

  const nowMs = Date.now();
  const sanitizedRows = rows.map((r) => {
    const isExpired = Boolean(r.expiresAt && new Date(r.expiresAt).getTime() <= nowMs);
    return {
      ...r,
      status: isExpired ? "active" : r.status,
      statusText: isExpired ? null : r.statusText,
      expiresAt: isExpired ? null : r.expiresAt,
    };
  });

  return Response.json(sanitizedRows);
}, "attendance:read");
