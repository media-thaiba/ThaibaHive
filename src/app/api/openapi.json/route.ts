import { NextResponse } from "next/server";
import { verifySession, hasPermission } from "@/lib/auth";
import type { StaffRole } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    const session = await verifySession();
    if (!session || !hasPermission(session.role as StaffRole, "admin:all")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const openapiSpec = {
    openapi: "3.1.0",
    info: {
      title: "ThaibaHive LMS & ERP Core API",
      version: "1.0.0",
      description: "Official OpenAPI 3.1 Specification for ThaibaHive Multi-Tenant Learning & Enterprise Resource Management System.",
      contact: {
        name: "ThaibaHive Engineering Team",
        email: "api@thaibahive.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local Development Server",
      },
      {
        url: "https://staging.thaibahive.com",
        description: "Staging Test Environment",
      },
      {
        url: "https://thaibahive.com",
        description: "Production Server",
      },
    ],
    tags: [
      { name: "Authentication", description: "User authentication, JWT session management, and mobile handoff" },
      { name: "Staff Management", description: "Staff directory, employee profiles, and campus assignments" },
      { name: "Attendance & Shifts", description: "NFC/QR code check-in, presence logging, and work shifts" },
      { name: "Leaves & Approvals", description: "Leave requests, balances, multi-stage approval workflows" },
      { name: "Performance Reviews", description: "Self-evaluations, manager appraisals, rating scores" },
      { name: "Marketplace Apps", description: "App directory, access requests, role assignments" },
      { name: "System & Telemetry", description: "Health checks, live SSE real-time event broadcasting" },
    ],
    paths: {
      "/api/auth/login": {
        post: {
          tags: ["Authentication"],
          summary: "Authenticate user and issue JWT session cookie",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                  required: ["email", "password"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Successful login with session cookie set" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Authentication"],
          summary: "Get current authenticated user profile and active session permissions",
          security: [{ CookieAuth: [] }, { BearerAuth: [] }],
          responses: {
            "200": { description: "Current session user profile data" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/staff": {
        get: {
          tags: ["Staff Management"],
          summary: "List all active staff members with optional department filtering",
          security: [{ CookieAuth: [] }, { BearerAuth: [] }],
          parameters: [
            {
              name: "departmentId",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Filter staff by department ID",
            },
          ],
          responses: {
            "200": { description: "List of staff profiles" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/attendance/check-in": {
        post: {
          tags: ["Attendance & Shifts"],
          summary: "Submit attendance check-in record via NFC, QR code, or GPS",
          security: [{ CookieAuth: [] }, { BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    method: { type: "string", enum: ["nfc", "qr", "gps"] },
                    locationId: { type: "string" },
                    latitude: { type: "number" },
                    longitude: { type: "number" },
                  },
                  required: ["method"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Check-in recorded successfully" },
            "400": { description: "Invalid check-in payload or distance threshold exceeded" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/leaves": {
        get: {
          tags: ["Leaves & Approvals"],
          summary: "List leave requests for authenticated staff member",
          security: [{ CookieAuth: [] }, { BearerAuth: [] }],
          responses: {
            "200": { description: "List of leave requests" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
        post: {
          tags: ["Leaves & Approvals"],
          summary: "Submit new leave request",
          security: [{ CookieAuth: [] }, { BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    leaveTypeId: { type: "string" },
                    startDate: { type: "string", format: "date" },
                    endDate: { type: "string", format: "date" },
                    daysCount: { type: "number", minimum: 0.5 },
                    reason: { type: "string" },
                  },
                  required: ["leaveTypeId", "startDate", "endDate", "daysCount"],
                },
              },
            },
          },
          responses: {
            "201": { description: "Leave request submitted successfully" },
            "400": { description: "Validation error or insufficient leave balance" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/reviews": {
        get: {
          tags: ["Performance Reviews"],
          summary: "Get performance evaluation cycles for staff member",
          security: [{ CookieAuth: [] }, { BearerAuth: [] }],
          responses: {
            "200": { description: "Performance review records" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/marketplace/apps": {
        get: {
          tags: ["Marketplace Apps"],
          summary: "List available marketplace applications and installation status",
          security: [{ CookieAuth: [] }, { BearerAuth: [] }],
          responses: {
            "200": { description: "List of marketplace apps" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/system/health": {
        get: {
          tags: ["System & Telemetry"],
          summary: "System health probe & database latency check",
          parameters: [
            {
              name: "x-health-secret",
              in: "header",
              required: false,
              schema: { type: "string" },
              description: "Secret header token to unlock detailed telemetry",
            },
          ],
          responses: {
            "200": { description: "System health status" },
            "503": { description: "Database ping check failed" },
          },
        },
      },
      "/api/notifications/subscribe": {
        get: {
          tags: ["System & Telemetry"],
          summary: "Subscribe to real-time Server-Sent Events (SSE) notification stream",
          security: [{ CookieAuth: [] }, { BearerAuth: [] }],
          responses: {
            "200": { description: "SSE EventSource text/event-stream opened" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        CookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "thaibahive_session",
          description: "Encrypted HTTP-Only session cookie",
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Authorization header with Bearer JWT token",
        },
      },
      responses: {
        Unauthorized: {
          description: "Authentication failed or session expired",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: { type: "string", example: "Not authenticated" },
                },
              },
            },
          },
        },
        Forbidden: {
          description: "Role permissions insufficient for requested resource",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: { type: "string", example: "Forbidden" },
                },
              },
            },
          },
        },
      },
    },
  };

  return NextResponse.json(openapiSpec);
}
