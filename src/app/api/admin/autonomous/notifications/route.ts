import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { RemediationNotificationRouter } from "@/lib/services/remediation-notification-router";

export const POST = requireAuth(async (request: Request) => {
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { ticketId, recipientId, recipientRole, channel, template, templateVars } = (body as Record<string, unknown>) || {};

  if (!ticketId || !recipientId || !recipientRole || !template) {
    return NextResponse.json(
      { error: "Missing required fields: ticketId, recipientId, recipientRole, template" },
      { status: 400 }
    );
  }

  try {
    const result = await RemediationNotificationRouter.dispatchNotification({
      ticketId: String(ticketId),
      recipientId: String(recipientId),
      recipientRole: recipientRole as "parent" | "staff" | "principal" | "regional_admin",
      channel: (channel as "push" | "sms" | "email" | "outbox") || "push",
      template: String(template),
      templateVars: templateVars as Record<string, string>,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Notification dispatch failed" },
      { status: 500 }
    );
  }
}, "autonomy:manage");
