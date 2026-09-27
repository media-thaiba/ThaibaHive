import { NextResponse } from "next/server";
import { db } from "@/db";
import { circulars } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = await db
      .select({
        id: circulars.id,
        title: circulars.title,
        description: circulars.description,
        category: circulars.category,
        fileUrl: circulars.fileUrl,
        createdAt: circulars.createdAt,
      })
      .from(circulars)
      .orderBy(desc(circulars.createdAt))
      .limit(20)
      .all();

    return NextResponse.json({ success: true, circulars: list });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch public circulars" }, { status: 500 });
  }
}
