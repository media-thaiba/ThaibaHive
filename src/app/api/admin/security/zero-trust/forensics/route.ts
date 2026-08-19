import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { ForensicCopilot } from '@/lib/security/forensics/forensic-copilot';
import { forensicAnalysisTriggerSchema } from '@/lib/validation/zasm-schemas';
import { ZasmAuditLogger } from '@/lib/security/zasm/zasm-audit-events';
import { ZasmDbStore } from '@/lib/security/zasm/zasm-db-store';
import { ZasmMetricsTracker } from '@/lib/security/zasm/zasm-metrics';

export const GET = withDPoP(
  requireAuth(async () => {
    const memoryReports = ForensicCopilot.listReports();
    const dbReports = await ZasmDbStore.listForensicReports();
    const reports = memoryReports.length > 0 ? memoryReports : dbReports;
    return NextResponse.json({ reports });
  }, 'system:security:audit'),
  { required: false }
);

export const POST = withDPoP(
  requireAuth(async (req: Request) => {
    try {
      const body = await req.json();
      const parsed = forensicAnalysisTriggerSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
      }

      const startTime = Date.now();
      const reports = await ForensicCopilot.analyze(parsed.data.signals as any);

      for (const rep of reports) {
        await ZasmDbStore.saveForensicReport(rep);
        await ZasmAuditLogger.logForensicReportGenerated(rep);
      }

      const durationSec = (Date.now() - startTime) / 1000;
      ZasmMetricsTracker.getInstance().recordForensicAnalysis(durationSec);

      return NextResponse.json({ success: true, reports }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
  }, 'system:security:audit'),
  { required: false }
);
