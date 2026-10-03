import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { EdgeVerificationEngine } from '@/lib/operations/biometrics/edge-verification-engine';
import { AimsDbStore } from '@/lib/operations/persistence/aims-db-store';
import { biometricAttendanceSchema } from '@/lib/validation/aims-schemas';
import { resolveRequestInstitution } from '@thaiba/auth/institution-scope';

export const GET = withDPoP(
  requireAuth(async (req: Request, _session) => {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || undefined;
    const store = AimsDbStore.getInstance();
    const logs = store.getBiometricLogs(userId);

    return NextResponse.json({
      logs,
      totalCount: logs.length,
    });
  }, 'system:biometrics:verify'),
  { required: false }
);

export const POST = withDPoP(
  requireAuth(async (req: Request, session) => {
    const body = await req.json();
    const parsed = biometricAttendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const resolvedCampusId = resolveRequestInstitution(session, parsed.data.campusId);

    const engine = new EdgeVerificationEngine();
    // Register mock active user template for verification endpoint
    engine.getMatcher().registerTemplate({
      templateId: 'tmpl_active',
      userId: 'user_active_student',
      dimension: 128,
      vector: parsed.data.queryEmbedding.slice(0, 128),
      enrolledAt: new Date().toISOString(),
      institutionId: resolvedCampusId,
    });

    const result = engine.verifyAttendance({
      campusId: resolvedCampusId,
      locationName: parsed.data.locationName,
      sessionId: parsed.data.sessionId,
      queryEmbedding: parsed.data.queryEmbedding.slice(0, 128),
      institutionId: resolvedCampusId,
    });

    if (result.record) {
      AimsDbStore.getInstance().saveBiometricLog({
        ...result.record,
        similarityScore: result.similarityScore,
      });
    }

    return NextResponse.json({
      success: result.success,
      record: result.record,
      message: result.message,
      latencyMs: result.latencyMs,
    });
  }, 'system:biometrics:verify'),
  { required: false }
);
