import { Resend } from "resend";

import { withRetry } from "@/lib/security/retry-backoff";
import { enqueueDlq } from "@/lib/notifications/dlq";
import { serverLogger as logger } from "@/lib/server-logger";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/**
 * Resilient Resend dispatch: bounded retry + DLQ fallback.
 *
 * Resend is an external dependency. A 5xx or network blip must not silently
 * drop a user-facing email (password reset, OTP, verification). This helper:
 *  - Retries transient failures with full-jitter backoff (max 3 attempts, 10s ceiling).
 *  - Enqueues to the DLQ on persistent failure so the reaper can retry later.
 *  - Never throws: always resolves to { success, error? }.
 */
async function sendResendEmail(
  params: { to: string; subject: string; html: string; from: string },
  context: { kind: string; target: string }
): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[EmailService] RESEND_API_KEY not configured. Email dispatch skipped.", { kind: context.kind, target: context.target });
    }
    return { success: true };
  }

  try {
    await withRetry(
      () =>
        resend.emails.send({
          from: params.from,
          to: params.to,
          subject: params.subject,
          html: params.html,
        }),
      {
        maxAttempts: 3,
        baseDelayMs: 200,
        maxDelayMs: 5000,
        isRetryable: (err) => {
          // Resend throws an API error object; classify by status/message.
          const status = (err as any)?.statusCode ?? (err as any)?.status;
          if (status === 429 || (status >= 500 && status <= 599)) return true;
          const msg = err instanceof Error ? err.message : String(err);
          return (
            msg.includes("timeout") ||
            msg.includes("ECONNRESET") ||
            msg.includes("ETIMEDOUT") ||
            msg.includes("fetch failed")
          );
        },
      }
    );
    return { success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    // Preserve the email payload for later retry instead of dropping it.
    enqueueDlq(
      `email:${context.kind}:${context.target}`,
      {
        kind: context.kind,
        to: params.to,
        from: params.from,
        subject: params.subject,
        html: params.html,
      },
      context.target,
      errMsg
    );
    logger.error("Email dispatch failed after retries, enqueued to DLQ", {
      kind: context.kind,
      target: context.target,
      error: errMsg,
    });
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendPasswordResetEmail(
  to: string,
  firstName: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string }> {
  const result = await sendResendEmail(
    {
      from: process.env.EMAIL_FROM || "noreply@thaibahive.com",
      to,
      subject: "Reset Your ThaibaHive Password",
      html: passwordResetTemplate(firstName, resetUrl),
    },
    { kind: "password-reset", target: to }
  );
  if (!result.success) {
    console.error("Failed to send password reset email:", result.error);
  }
  return result;
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
    </html>
  `;
}

export async function sendStepUpOTPEmail(
  to: string,
  firstName: string,
  otpCode: string,
): Promise<{ success: boolean; error?: string }> {
  const result = await sendResendEmail(
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
    { kind: "step-up-otp", target: to }
  );
  if (!result.success) {
    console.error("Failed to send OTP verification email:", result.error);
  }
  return result;
}

export async function sendVerificationEmail(
  to: string,
  firstName: string,
  verifyUrl: string
): Promise<{ success: boolean; error?: string }> {
  const result = await sendResendEmail(
    {
      from: process.env.EMAIL_FROM || "noreply@thaibahive.com",
      to,
      subject: "Verify Your ThaibaHive Email",
      html: emailVerificationTemplate(firstName, verifyUrl),
    },
    { kind: "verification", target: to }
  );
  if (!result.success) {
    console.error("Failed to send verification email:", result.error);
  }
  return result;
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

