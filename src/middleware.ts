import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = [
  "/auth/login",
  "/auth/signup",
  "/_next",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/mobile-handoff",
  "/favicon.ico",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const sessionCookie = request.cookies.get("thaibahive_session")?.value;
  if (!sessionCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
