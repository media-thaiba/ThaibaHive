import { NextResponse } from "next/server";
import { db } from "@/db";
import { helpDeskComments } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";

export const POST = requireAuth(async (request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();
  const { content } = body;
  if (!content) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }
  const comment = await db.insert(helpDeskComments).values({
    id: crypto.randomUUID(), ticketId: id, staffId: session.staffId, content,
  }).returning().get();
  return NextResponse.json({ comment }, { status: 201 });
}, "helpdesk:read");