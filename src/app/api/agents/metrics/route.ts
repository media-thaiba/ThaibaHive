import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { AgentMetricsExporter } from "@/lib/agents/telemetry/metrics-exporter";
import { isAgenticWorkflowsEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (req: Request, session: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId") || session?.institutionId || "global";

  if (!isAgenticWorkflowsEnabled(tenantId)) {
    return new Response("Agentic workflows feature is disabled\n", { status: 403 });
  }

  const exporter = AgentMetricsExporter.getInstance();
  const metricsData = await exporter.exportOpenMetrics(tenantId);

  return new Response(metricsData, {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}, "agent:telemetry:view");
