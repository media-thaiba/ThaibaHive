import { NextResponse } from "next/server";

export const FROZEN_PILOT_MODULES = [
  "finance",
  "fleet",
  "agents",
  "conferencing",
  "canteen",
  "workflow_studio",
  "digital_twin",
] as const;

export type FrozenPilotModule = typeof FROZEN_PILOT_MODULES[number];

/**
 * Checks if the V1.0 pilot feature freeze is currently active.
 *
 * FAILS CLOSED: In the absence of an explicit opt-out env var,
 * this function defaults to true (pilot freeze active).
 */
export function isPilotFreezeActive(): boolean {
  const envVal = (process.env.V1_PILOT_MODE || process.env.NEXT_PUBLIC_V1_PILOT || "").trim().toLowerCase();
  if (envVal === "false" || envVal === "disabled" || envVal === "off") {
    return false;
  }
  return true; // Default fail-closed: pilot freeze is active
}

/**
 * Returns a standardized 403 response for frozen modules during the V1.0 pilot
 */
export function pilotFrozenModuleResponse(moduleName: FrozenPilotModule) {
  return NextResponse.json(
    {
      error: `Forbidden: The '${moduleName}' module is frozen for the Version 1.0 Pilot and not available in this release.`,
      module: moduleName,
      status: "frozen_for_pilot",
      minAppVersion: "1.0.0-pilot.1",
    },
    { status: 403 }
  );
}

/**
 * Checks if a given pathname belongs to a frozen pilot module.
 * Covers both API endpoints and UI page routes (preventing server actions on page URLs).
 */
export function isFrozenPilotPath(pathname: string): FrozenPilotModule | null {
  const normalized = pathname.toLowerCase();

  // 1. Finance & Payroll
  if (
    normalized.startsWith("/api/finance") ||
    normalized.startsWith("/api/payroll") ||
    normalized.startsWith("/api/invoices") ||
    normalized.startsWith("/api/billing") ||
    normalized === "/finance" ||
    normalized.startsWith("/finance/") ||
    normalized === "/payroll" ||
    normalized.startsWith("/payroll/") ||
    normalized === "/portal/fees" ||
    normalized.startsWith("/portal/fees/") ||
    normalized === "/workspace/cashier" ||
    normalized.startsWith("/workspace/cashier/") ||
    normalized === "/operations/finance" ||
    normalized.startsWith("/operations/finance/")
  ) {
    return "finance";
  }

  // 2. Fleet & Transportation
  if (
    normalized.startsWith("/api/fleet") ||
    normalized.startsWith("/api/vehicles") ||
    normalized.startsWith("/api/transport") ||
    normalized === "/fleet" ||
    normalized.startsWith("/fleet/") ||
    normalized === "/vehicles" ||
    normalized.startsWith("/vehicles/") ||
    normalized === "/transport" ||
    normalized.startsWith("/transport/") ||
    normalized === "/operations/fleet" ||
    normalized.startsWith("/operations/fleet/")
  ) {
    return "fleet";
  }

  // 3. Autonomous Agents & AI Swarms
  if (
    normalized.startsWith("/api/agents") ||
    normalized.startsWith("/api/ai-agents") ||
    normalized === "/agents" ||
    normalized.startsWith("/agents/") ||
    normalized === "/ai-agents" ||
    normalized.startsWith("/ai-agents/")
  ) {
    return "agents";
  }

  // 4. Conferencing & Live Streaming
  if (
    normalized.startsWith("/api/conferencing") ||
    normalized.startsWith("/api/live-sessions") ||
    normalized.startsWith("/api/streaming") ||
    normalized === "/conferencing" ||
    normalized.startsWith("/conferencing/") ||
    normalized === "/live-sessions" ||
    normalized.startsWith("/live-sessions/") ||
    normalized === "/streaming" ||
    normalized.startsWith("/streaming/")
  ) {
    return "conferencing";
  }

  // 5. Canteen
  if (
    normalized.startsWith("/api/canteen") ||
    normalized.startsWith("/api/meals") ||
    normalized === "/canteen" ||
    normalized.startsWith("/canteen/") ||
    normalized === "/meals" ||
    normalized.startsWith("/meals/")
  ) {
    return "canteen";
  }

  // 6. Workflow Studio
  if (
    normalized.startsWith("/api/workflow-studio") ||
    normalized.startsWith("/api/workflows") ||
    normalized === "/workflow-studio" ||
    normalized.startsWith("/workflow-studio/") ||
    normalized === "/workflows" ||
    normalized.startsWith("/workflows/")
  ) {
    return "workflow_studio";
  }

  // 7. Digital Twin & 3D Telemetry
  if (
    normalized.startsWith("/api/digital-twin") ||
    normalized.startsWith("/api/twin") ||
    normalized === "/digital-twin" ||
    normalized.startsWith("/digital-twin/") ||
    normalized === "/twin" ||
    normalized.startsWith("/twin/")
  ) {
    return "digital_twin";
  }

  return null;
}
