import { NextResponse } from "next/server";
import { mintCsrfToken } from "@/lib/api/csrf";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = await mintCsrfToken();
  return NextResponse.json({ csrfToken: token });
}
