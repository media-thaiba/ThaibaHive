import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { RegionHealthManager } from "@/lib/mesh/region-health";

export const GET = requireAuth(async (_request: Request, _session) => {
  try {
    const manager = new RegionHealthManager([
      { regionId: "us-east", nodeName: "Primary-US", endpoint: "https://us-east.api.thaibahive.org", status: "ONLINE", latencyMs: 10, lastHeartbeat: Date.now() },
      { regionId: "eu-west", nodeName: "Secondary-EU", endpoint: "https://eu-west.api.thaibahive.org", status: "ONLINE", latencyMs: 80, lastHeartbeat: Date.now() },
      { regionId: "ap-south", nodeName: "Secondary-AP", endpoint: "https://ap-south.api.thaibahive.org", status: "ONLINE", latencyMs: 140, lastHeartbeat: Date.now() },
    ]);

    return NextResponse.json({
      success: true,
      nodes: manager.getAllNodes(),
      healthyCount: manager.getHealthyNodes().length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}, "mesh:admin");
