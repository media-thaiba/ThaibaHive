import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { SignJWT } from "jose";
import { db, tables } from "../../db";
import { eq } from "drizzle-orm";
import { authenticate, createToken, AuthRequest } from "../../middleware/auth";
import { verifyGoogleToken } from "../../utils/google";

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Strict limit of 5 attempts
  message: { error: "Too many authentication requests, please try again after 15 minutes." },
  standardHeaders: true, // Enable RateLimit-* headers
  legacyHeaders: false,  // Disable older headers
});

const handoffLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many handoff requests, please try again later" },
});

function getAuthJwtSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) throw new Error("AUTH_JWT_SECRET environment variable is required for mobile handoff");
  return secret;
}

const ALLOWED_EMAIL_DOMAINS = ["thaibahive.com", "thaiba.edu.in"];

function isAllowedEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

authRouter.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const users = await db.select().from(tables.staff).where(eq(tables.staff.email, email)).all();
    const user = users[0] || null;
    if (!user || !user.passwordHash) return res.status(401).json({ error: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    if (!user.isActive) return res.status(403).json({ error: "Account is deactivated" });
    const token = await createToken({ id: user.id, email: user.email, role: user.role, employeeId: user.employeeId, tokenVersion: user.tokenVersion });
    const { passwordHash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/signup", authLimiter, async (req, res) => {
  try {
    const { email, password, firstName, lastName, employeeId } = req.body;
    if (!email || !password || !firstName || !lastName || !employeeId) return res.status(400).json({ error: "Missing required fields" });
    if (!isAllowedEmail(email)) return res.status(400).json({ error: "Email domain not allowed" });
    const existingUsers = await db.select().from(tables.staff).where(eq(tables.staff.email, email)).all();
    if (existingUsers[0]) return res.status(409).json({ error: "Email already exists" });
    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuid();
    const role = "staff"; // Always assign staff role — never accept from request body
    const tokenVersion = 0;
    await db.insert(tables.staff).values({ id, email, passwordHash, firstName, lastName, employeeId, role, tokenVersion }).run();
    const token = await createToken({ id, email, role, employeeId, tokenVersion });
    res.status(201).json({ token, user: { id, email, firstName, lastName, employeeId, role } });
  } catch (err: any) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/logout", (_req, res) => res.json({ message: "Logged out successfully" }));

authRouter.get("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const users = await db.select().from(tables.staff).where(eq(tables.staff.id, req.user!.id)).all();
    const user = users[0] || null;
    if (!user) return res.status(404).json({ error: "User not found" });
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  } catch (err: any) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.put("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const { firstName, lastName, phone, designation, dateOfBirth, avatarUrl } = req.body;
    await db.update(tables.staff).set({ firstName, lastName, phone, designation, dateOfBirth, avatarUrl, updatedAt: new Date().toISOString() }).where(eq(tables.staff.id, req.user!.id)).run();
    const users = await db.select().from(tables.staff).where(eq(tables.staff.id, req.user!.id)).all();
    const user = users[0] || null;
    if (!user) return res.status(404).json({ error: "User not found" });
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  } catch (err: any) {
    console.error("Update user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/mobile-handoff/nonce", authenticate, handoffLimiter, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const secret = new TextEncoder().encode(getAuthJwtSecret());
    const jti = uuid();

    const nonce = await new SignJWT({
      staffId: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      name: `${req.body.firstName || ""} ${req.body.lastName || ""}`.trim() || user.email,
      tokenVersion: user.tokenVersion,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("60s")
      .setJti(jti)
      .sign(secret);

    res.json({ nonce });
  } catch (err: any) {
    console.error("Mobile handoff nonce error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/google", authLimiter, async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "Google ID token is required" });

    const allowedClientIds = process.env.GOOGLE_CLIENT_IDS
      ? process.env.GOOGLE_CLIENT_IDS.split(",").map(c => c.trim())
      : [];

    let payload;
    try {
      payload = await verifyGoogleToken(idToken, allowedClientIds);
    } catch (err: any) {
      console.error("Google token verification failed:", err);
      return res.status(401).json({ error: err.message || "Invalid Google token" });
    }

    const { email } = payload;
    const users = await db.select().from(tables.staff).where(eq(tables.staff.email, email)).all();
    const user = users[0] || null;

    if (!user) {
      return res.status(404).json({ error: `Account with email ${email} is not registered in the system.` });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account is deactivated" });
    }

    const token = await createToken({
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      tokenVersion: user.tokenVersion,
    });

    const { passwordHash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err: any) {
    console.error("Google login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

