import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";
import { z } from "zod";

const reorderSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string(),
      status: z.string(),
      sortOrder: z.number(),
    })
  ),
});

export const PATCH = requireAuth(async (request: Request) => {
  const body = await request.json();
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Update all tasks' statuses and sort orders inside a transaction to ensure database consistency
  await db.transaction(async (tx) => {
    for (const item of parsed.data.tasks) {
      await tx
        .update(tasks)
        .set({
          status: item.status,
          sortOrder: item.sortOrder,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(tasks.id, item.id));
    }
  });

  return NextResponse.json({ success: true });
}, "tasks:create");
