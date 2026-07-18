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
      firstName: staff.firstName,
      lastName: staff.lastName,
      avatarUrl: staff.avatarUrl,
    })
    .from(presence)
    .innerJoin(staff, eq(presence.staffId, staff.id))
    .all();

  return Response.json(rows);
}, "attendance:read");
