import { Resend } from "resend";

/**
 * Hard ceiling for a single Resend API call.
 *
 * A stalled provider connection must never consume an entire Vercel function
 * invocation budget (300s default on Fluid Compute). After this ceiling the
 * delivery outcome is reported as "unknown" rather than "failed".
 */
export const RESEND_HARD_TIMEOUT_MS = 8000;

export type EmailSendStatus = "sent" | "failed" | "unknown";

export type EmailSendResult = {
  success: boolean;
  status?: EmailSendStatus;
  error?: string;
};

export type EmailKind = "password_reset" | "verification" | "otp";

type ResendEmailPayload = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

class ResendTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResendTimeoutError";
  }
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/**
 * Race a promise against an explicit hard timeout.
 *
 * The `finally` block always clears the timer, and `Promise.race` subscribes to
 * both inputs immediately, so the losing side is always observed — a late
 * settlement of `promise` can never surface as an unhandled rejection.
 */
async function withHardTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Attach a no-op catch to the promise so a late rejection after timeout does not bubble as unhandledRejection
  promise.catch(() => {});

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ResendTimeoutError(message)), ms);
  });
  timeout.catch(() => {});

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Dispatch one email through Resend with an 8000ms hard timeout.
 *
 * Returns `{ success: false, status: "unknown", error }` on timeout — the
 * request may still complete server-side, so callers must treat it as a soft
 * outcome: the user action does NOT fail and no automatic request-path retry
 * is queued (that would only compound latency). Non-timeout failures are
 * rethrown so existing caller-side logging is preserved.
 */
export async function sendResendEmail(
  resend: Resend,
  payload: ResendEmailPayload,
  kind: EmailKind = "verification",
  institutionId?: string | null
): Promise<EmailSendResult> {
  try {
    const res = await withHardTimeout(
      resend.emails.send(payload),
      RESEND_HARD_TIMEOUT_MS,
      `Resend email delivery timed out after ${RESEND_HARD_TIMEOUT_MS}ms`
    );

    // Resend SDK resolves with { data, error } rather than throwing on API-level errors
    if (res && typeof res === "object" && "error" in res && (res as any).error) {
      const apiErr = (res as any).error;
      const errMsg = apiErr?.message || "Resend delivery rejected by API";
      return {
        success: false,
        status: "failed",
        error: errMsg,
      };
    }

    return { success: true, status: "sent" };
  } catch (error) {
    if (error instanceof ResendTimeoutError) {
      // Structured JSON log without recipient address (PII preservation)
      process.stderr.write(
        JSON.stringify({
          event: "resend_timeout",
          kind,
          institutionId: institutionId ?? null,
          timeoutMs: RESEND_HARD_TIMEOUT_MS,
        }) + "\n"
      );
      return {
        success: false,
        status: "unknown",
        error: `Resend email delivery timed out after ${RESEND_HARD_TIMEOUT_MS}ms`,
      };
    }
    throw error;
  }
}

export async function sendPasswordResetEmail(
  to: string,
  firstName: string,
  resetUrl: string,
  institutionId?: string | null
): Promise<EmailSendResult> {
  try {
    const resend = getResendClient();
    if (!resend) {
      if (process.env.VERCEL_ENV === "production") {
        console.error("[EmailService] RESEND_API_KEY missing in production environment");
        return {
          success: false,
          status: "failed",
          error: "Email delivery unconfigured: RESEND_API_KEY missing in production",
        };
      }
      console.warn("[EmailService] RESEND_API_KEY not configured. Password reset email dispatch skipped.");
      return { success: true, status: "sent" };
    }

    return await sendResendEmail(
      resend,
      {
        from: process.env.EMAIL_FROM || "noreply@thaibahive.com",
        to,
        subject: "Reset Your ThaibaHive Password",
        html: passwordResetTemplate(firstName, resetUrl),
      },
      "password_reset",
      institutionId
    );
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return { success: false, status: "failed", error: "Failed to send email" };
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
          <p>ThaibaHive — Thaiba Family App</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendStepUpOTPEmail(
  to: string,
  firstName: string,
  otpCode: string,
  institutionId?: string | null
): Promise<EmailSendResult> {
  try {
    const resend = getResendClient();
    if (!resend) {
      if (process.env.VERCEL_ENV === "production") {
        console.error("[EmailService] RESEND_API_KEY missing in production environment");
        return {
          success: false,
          status: "failed",
          error: "Email delivery unconfigured: RESEND_API_KEY missing in production",
        };
      }
      console.warn("[EmailService] RESEND_API_KEY not configured. Step-up OTP email logged to server logger.");
      return { success: true, status: "sent" };
    }

    return await sendResendEmail(
      resend,
      {
        from: process.env.EMAIL_FROM || "security@thaibahive.com",
        to,
        subject: "Your ThaibaHive Security Verification Code",
        html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Security Verification Required</h2>
          <p>Hello ${firstName},</p>
          <p>A login attempt requires additional security verification. Use the following one-time verification code:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 16px; background: #f1f5f9; text-align: center; border-radius: 8px; margin: 20px 0;">
            ${otpCode}
          </div>
          <p>This code expires in 10 minutes. If you did not attempt to sign in, please notify security administrators immediately.</p>
        </div>
      `,
      },
      "otp",
      institutionId
    );
  } catch (error) {
    console.error("Failed to send OTP verification email:", error);
    return { success: false, status: "failed", error: "Failed to send email" };
  }
}

export async function sendVerificationEmail(
  to: string,
  firstName: string,
  verifyUrl: string,
  institutionId?: string | null
): Promise<EmailSendResult> {
  try {
    const resend = getResendClient();
    if (!resend) {
      if (process.env.VERCEL_ENV === "production") {
        console.error("[EmailService] RESEND_API_KEY missing in production environment");
        return {
          success: false,
          status: "failed",
          error: "Email delivery unconfigured: RESEND_API_KEY missing in production",
        };
      }
      console.warn(
        `[EmailService] RESEND_API_KEY not configured. Verification link dispatch skipped.`
      );
      return { success: true, status: "sent" };
    }

    return await sendResendEmail(
      resend,
      {
        from: process.env.EMAIL_FROM || "noreply@thaibahive.com",
        to,
        subject: "Verify Your ThaibaHive Email",
        html: emailVerificationTemplate(firstName, verifyUrl),
      },
      "verification",
      institutionId
    );
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return { success: false, status: "failed", error: "Failed to send email" };
  }
}

function emailVerificationTemplate(firstName: string, verifyUrl: string): string {
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
          <h2>Verify Your Email</h2>
          <p>Hello ${firstName},</p>
          <p>Welcome to ThaibaHive! Confirm your email address to activate your account:</p>
          <a href="${verifyUrl}" class="button">Verify Email</a>
          <div class="warning">
            <strong>This link expires in 24 hours.</strong> You won't be able to sign in until your email is verified.
          </div>
          <p>If the button doesn't work, copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; color: #6366f1;">${verifyUrl}</p>
        </div>
        <div class="footer">
          <p>ThaibaHive — Thaiba Family App</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
