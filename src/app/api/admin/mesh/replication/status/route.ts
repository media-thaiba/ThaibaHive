import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";

export const GET = requireAuth(async (request: Request, session) => {
  try {
    return NextResponse.json({
      success: true,
      meshStatus: {
        activeNodesCount: 3,
        regions: [
          { regionId: "us-east", status: "ONLINE", latencyMs: 12, queueDepth: 0 },
          { regionId: "eu-west", status: "ONLINE", latencyMs: 85, queueDepth: 2 },
          { regionId: "ap-south", status: "ONLINE", latencyMs: 140, queueDepth: 0 },
        ],
        replicationLagSeconds: 0.8,
        totalMutationsReplicated: 1420,
        activeConflictsCount: 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}, "mesh:admin");
