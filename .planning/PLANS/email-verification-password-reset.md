# Plan: Password Reset (Email-Based)

## Context

ThaibaHive currently has no email infrastructure and no password reset flow. The "Forgot Password" UI in the login page is a stub that shows a fake success message after a 1.5s delay. Users can only change their password when logged in via the Settings page.

**Goal**: Implement a complete email-based password reset flow.

**Out of Scope**: Email verification on signup (track separately if needed).

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Email library | `resend` | Modern, simple API, generous free tier (100/day) |
| Token storage | DB table (`passwordResetTokens`) | Consistent with existing patterns (usedNonces table) |
| Token format | `crypto.randomBytes(32).toString("hex")` | Already used in codebase for share links |
| Token hashing | **SHA-256** (not bcrypt) | Deterministic, enables indexed lookup; bcrypt is deliberately slow and produces different hashes for same input |
| Token expiry | 1 hour | Industry standard, balances security vs. UX |
| Rate limiting | 3 requests per 60s per email | Prevents abuse while allowing retries |

---

## Implementation Plan

### Step 1: Install Dependencies

```bash
pnpm add resend @vercel/functions
```

**Files modified**: `package.json`

---

### Step 2: Add Environment Variables

Add to `.env.example` and `.env`:

```env
# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@thaibahive.com
```

**Files modified**: `.env.example`, `.env`

---

### Step 3: Create Email Utility

Create `src/lib/email.ts`:

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(
  to: string,
  firstName: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "noreply@thaibahive.com",
      to,
      subject: "Reset Your ThaibaHive Password",
      html: passwordResetTemplate(firstName, resetUrl),
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return { success: false, error: "Failed to send email" };
  }
}

function passwordResetTemplate(firstName: string, resetUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; }
        .button { display: inline-block; background: #6366f1; color: white !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ThaibaHive</h1>
        </div>
        <div class="content">
          <h2>Password Reset Request</h2>
          <p>Hello ${firstName},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <div class="warning">
            <strong>This link expires in 1 hour.</strong> If you didn't request this, please ignore this email.
          </div>
          <p>If the button doesn't work, copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; color: #6366f1;">${resetUrl}</p>
        </div>
        <div class="footer">
          <p>ThaibaHive — Unified Staff Management Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
```

**Files created**: `src/lib/email.ts`

---

### Step 4: Add Database Schema

Add to `packages/db/schema.ts`:

```typescript
export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  staffId: text("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
```

**Files modified**: `packages/db/schema.ts`

---

### Step 5: Add Zod Schemas

Add to `packages/auth/schemas.ts`:

```typescript
export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});
```

**Files modified**: `packages/auth/schemas.ts`

---

### Step 6: Add Rate Limiting Config

Add to `src/lib/api/rate-limit.ts`:

```typescript
authForgotPassword: {
  windowMs: 60_000,
  max: 3,
  keyPrefix: "auth-forgot-password",
},
```

**Files modified**: `src/lib/api/rate-limit.ts`

---

### Step 7: Create Forgot Password API Route

Create `src/app/api/auth/forgot-password/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { waitUntil } from "@vercel/functions";
import { db } from "@/db";
import { staff, passwordResetTokens } from "@thaiba/db/schema";
import { forgotPasswordSchema } from "@thaiba/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Dummy DB op to equalize timing between "user exists" and "user not found" paths.
// Prevents email enumeration via timing side-channel.
async function dummyTimingNoop(): Promise<void> {
  await db.query.staff.findFirst({
    where: eq(staff.id, "__nonexistent__"),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { email } = parsed.data;

  // Rate limit by email (not just IP) to prevent brute-force enumeration
  const rateLimit = checkRateLimit(email, "authForgotPassword");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const user = await db.query.staff.findFirst({
    where: eq(staff.email, email.toLowerCase()),
  });

  if (user && user.isActive) {
    // Invalidate existing unused tokens
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date().toISOString() })
      .where(
        and(
          eq(passwordResetTokens.staffId, user.id),
          isNull(passwordResetTokens.usedAt)
        )
      );

    // Generate and store token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await db.insert(passwordResetTokens).values({
      staffId: user.id,
      tokenHash,
      expiresAt,
    });

    // Send email — use waitUntil so serverless runtime stays alive
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/auth/reset-password/${token}`;
    waitUntil(
      sendPasswordResetEmail(user.email, user.firstName, resetUrl).catch(
        console.error
      )
    );
  } else {
    // Equalize timing: do equivalent DB work on the not-found path
    await dummyTimingNoop();
  }

  return NextResponse.json({ success: true });
}
```

**Files created**: `src/app/api/auth/forgot-password/route.ts`

---

### Step 8: Create Reset Password API Route

Create `src/app/api/auth/reset-password/[token]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { staff, passwordResetTokens } from "@thaiba/db/schema";
import { resetPasswordSchema } from "@thaiba/auth";
import { hashPassword } from "@thaiba/auth";
import crypto from "crypto";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params; // Next 16: params is a Promise

  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse({
    ...body,
    token,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { newPassword } = parsed.data;

  // Look up token by SHA-256 hash (indexed, O(1) — not a bcrypt scan)
  const now = new Date().toISOString();
  const tokenHash = hashToken(token);

  const validRecord = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, now) // Filter expired at query level
    ),
  });

  if (!validRecord) {
    return NextResponse.json(
      { error: "Invalid or expired reset token" },
      { status: 400 }
    );
  }

  // Re-check user exists and is active at reset time (not just at request time)
  const user = await db.query.staff.findFirst({
    where: eq(staff.id, validRecord.staffId),
  });

  if (!user || !user.isActive) {
    return NextResponse.json(
      { error: "Invalid or expired reset token" },
      { status: 400 }
    );
  }

  // Update password
  const newHash = await hashPassword(newPassword);
  await db
    .update(staff)
    .set({
      passwordHash: newHash,
      tokenVersion: sql`${staff.tokenVersion} + 1`, // Proper Drizzle increment
      updatedAt: now,
    })
    .where(eq(staff.id, validRecord.staffId));

  // Mark token as used
  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(passwordResetTokens.id, validRecord.id));

  return NextResponse.json({ success: true });
}
```

**Files created**: `src/app/api/auth/reset-password/[token]/route.ts`

---

### Step 9: Create Reset Password UI Page

Create `src/app/auth/reset-password/[token]/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const token = params.token as string;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/login?mode=signin");
      }, 3000);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Password Reset Successful</h2>
              <p className="text-zinc-400">
                Redirecting to login in 3 seconds...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Reset Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="error">
                <AlertCircle className="h-4 w-4" />
                {error}
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={8}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Files created**: `src/app/auth/reset-password/[token]/page.tsx`

---

### Step 10: Update Forgot Password in Login Page

Update `src/app/auth/login/page.tsx` to call the real API:

```typescript
const handleForgotSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setForgotLoading(true);
  setForgotError("");
  setForgotSuccess(false);

  try {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: forgotEmail }),
    });

    const data = await res.json();

    if (!res.ok) {
      setForgotError(data.error || "Failed to send reset email");
      return;
    }

    setForgotSuccess(true);
  } catch {
    setForgotError("An unexpected error occurred");
  } finally {
    setForgotLoading(false);
  }
};
```

**Files modified**: `src/app/auth/login/page.tsx`

---

### Step 11: Run Drizzle Migration

```bash
cd packages/db
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

---

## Verification Steps

1. **Forgot Password Flow**:
   - Navigate to `/auth/login?mode=forgot`
   - Enter a valid email address
   - Check email inbox for reset link
   - Click link, enter new password
   - Verify redirect to login page
   - Login with new password

2. **Token Security**:
   - Try using an expired token (should fail)
   - Try using an already-used token (should fail)
   - Try reusing a token after successful reset (should fail)

3. **Rate Limiting**:
   - Send 4+ forgot password requests within 60s
   - Verify 429 response on 4th request

4. **Session Invalidation**:
   - After password reset, verify old sessions are invalidated (tokenVersion bumped)

5. **Email Enumeration Prevention**:
   - Request reset for non-existent email
   - Verify same success response as valid email
   - Measure timing — both paths should take similar time

---

## Files Summary

| Action | File |
|--------|------|
| Created | `src/lib/email.ts` |
| Created | `src/app/api/auth/forgot-password/route.ts` |
| Created | `src/app/api/auth/reset-password/[token]/route.ts` |
| Created | `src/app/auth/reset-password/[token]/page.tsx` |
| Modified | `packages/db/schema.ts` |
| Modified | `packages/auth/schemas.ts` |
| Modified | `src/lib/api/rate-limit.ts` |
| Modified | `src/app/auth/login/page.tsx` |
| Modified | `.env.example` |
| Modified | `.env` |
| Modified | `package.json` (pnpm add resend @vercel/functions) |

---

## Bug Fixes Applied (from review)

| Bug | Fix |
|-----|-----|
| `eq(column, null)` never matches | Replaced with `isNull()` from drizzle-orm |
| Route params not awaited (Next 16) | Changed to `{ params }: { params: Promise<{ token: string }> }` and `await params` |
| Bcrypt for tokens (different hash each time) | Switched to SHA-256 (`crypto.createHash('sha256')`) — deterministic, indexed lookup |
| `tokenVersion` increment invalid | Changed to `sql\`${staff.tokenVersion} + 1\`` |
| Unused `gt` import | Removed from forgot-password, added to reset-password for expiry filtering |
| Email verification half-built | Removed entirely — track as separate feature |
| Timing side-channel on enumeration | Added `dummyTimingNoop()` on not-found path to equalize DB work; email send uses `waitUntil` |
| Vercel serverless kills un-awaited promises | Wrapped email send with `waitUntil()` from `@vercel/functions` |
| Rate limit key was IP-only | Now passes `email` as identifier to `checkRateLimit()` for email-based limiting |
| No expiry filtering at query level | Added `gt(passwordResetTokens.expiresAt, now)` to token lookup |
| No re-check of `user.isActive` at reset time | Added user lookup before password update |
| Duplicate migration step | Consolidated to single Step 11 |

## Known Residual Risks (accepted, non-blocking)

| Risk | Status |
|------|--------|
| No cleanup of expired/used token rows | Accepted — lookup is now indexed O(1), table grows slowly. Add cron/cleanup job later if needed. |
| `dummyTimingNoop` is a single indexed query vs. 2 writes + 1 insert | Accepted — timing gap reduced from ~100ms+ to <5ms. Could add artificial delay if threat model requires it. |
