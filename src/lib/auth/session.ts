import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { authConfig } from "./config";

const secret = new TextEncoder().encode(authConfig.jwtSecret);

export type SessionPayload = {
  staffId: string;
  email: string;
  role: string;
  employeeId: string;
  name: string;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(authConfig.sessionExpiry)
    .setIssuedAt()
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(authConfig.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return token;
}

export async function verifySession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(authConfig.cookieName)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(authConfig.cookieName);
}
