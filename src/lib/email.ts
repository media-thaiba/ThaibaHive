import { Resend } from "resend";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendPasswordResetEmail(
  to: string,
  firstName: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.warn("[EmailService] RESEND_API_KEY not configured. Password reset email dispatch skipped.");
      return { success: true };
    }

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
