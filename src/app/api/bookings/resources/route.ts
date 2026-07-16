import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookingResources } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { desc } from "drizzle-orm";

export const GET = requireAuth(async () => {
  const resources = await db.select().from(bookingResources).orderBy(desc(bookingResources.createdAt)).all();
  return NextResponse.json({ resources });
}, "bookings:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { name, type, capacity, location, description } = body;
  if (!name || !type) {
    return NextResponse.json({ error: "Name and type required" }, { status: 400 });
  }
  const resource = await db.insert(bookingResources).values({
    id: crypto.randomUUID(), name, type, capacity, location, description,
  }).returning().get();
  return NextResponse.json({ resource }, { status: 201 });
}, "bookings:manage");