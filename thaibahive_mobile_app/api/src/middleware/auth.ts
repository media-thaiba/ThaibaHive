import { Request, Response, NextFunction } from "express";
import { SignJWT, jwtVerify } from "jose";
import { v4 as uuid } from "uuid";
import { db, tables } from "../db";
import { eq } from "drizzle-orm";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  employeeId: string;
  tokenVersion: number;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

const getSecret = () => SECRET_KEY;

export async function createToken(payload: AuthUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .setJti(uuid())
    .sign(getSecret());
}

export async function createRefreshToken(payload: AuthUser): Promise<string> {
  return new SignJWT({ id: payload.id, type: "refresh", tokenVersion: payload.tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .setJti(uuid())
    .sign(getSecret());
}

export async function verifyRefreshToken(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.type !== "refresh") {
      throw new Error("Not a refresh token");
    }
    return payload;
  } catch (err: any) {
    throw new Error(err.message || "Invalid or expired refresh token");
  }
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }
  const token = header.split(" ")[1];
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const decoded = payload as unknown as AuthUser;

    // Reject tokens without tokenVersion (pre-Phase-1 legacy tokens)
    if (typeof decoded.tokenVersion !== "number") {
      return res.status(401).json({ error: "Invalid token format" });
    }

    // Verify user still exists and is active in database
    const users = await db
      .select({ isActive: tables.staff.isActive, tokenVersion: tables.staff.tokenVersion })
      .from(tables.staff)
      .where(eq(tables.staff.id, decoded.id))
      .all();
    const user = users[0] || null;

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Account is deactivated" });
    }

    // Check tokenVersion matches (invalidates JWTs after password change or admin revocation)
    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: "Session invalid, please login again" });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
