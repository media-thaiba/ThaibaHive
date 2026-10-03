import { NextResponse } from "next/server";
import { db } from "@/db";
import { performanceGoals } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const PATCH = requireAuth(async (request: Request, session, context) => {
  try {
    const params = context?.params ? await context.params : {};
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: "Goal ID is required" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(performanceGoals)
      .where(eq(performanceGoals.id, id))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const isOwner = existing.staffId === session.staffId;
    const isSuperOrAdmin = session.role === "super_admin" || session.role === "admin" || session.role === "hod";

    if (!isOwner && !isSuperOrAdmin) {
      return NextResponse.json({ error: "Forbidden: Cannot update goals for other staff" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.targetDate !== undefined) updateData.targetDate = body.targetDate;
    if (body.progressPercentage !== undefined) {
      const p = Math.max(0, Math.min(100, Number(body.progressPercentage)));
      updateData.progressPercentage = p;
      if (p === 100 && !body.status) {
        updateData.status = "completed";
      }
    }
    if (body.status !== undefined) updateData.status = body.status;

    const updated = await db
      .update(performanceGoals)
      .set(updateData)
      .where(eq(performanceGoals.id, id))
      .returning()
      .get();

    return NextResponse.json({ goal: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update goal" },
      { status: 400 }
    );
  }
}, "performance:evaluate");
