import { NextResponse } from "next/server";
import { db } from "@/db";
import { taskComments } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
export const POST = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  if (!body.content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const comment = await db
    .insert(taskComments)
    .values({
      id: crypto.randomUUID(),
      taskId: id,
      staffId: session.staffId,
      content: body.content,
    })
    .returning()
    .get();

  return NextResponse.json({ comment }, { status: 201 });
});
