/**
 * Admin Predictive Threats API Endpoint
 * Sprint-042 (ARES) — ARES-020
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { ThreatForecaster } from '@/lib/security/ares/threat-forecaster';
import { PredictiveAlertSystem } from '@/lib/security/ares/predictive-alert-system';
import { AresDbStore } from '@/lib/security/ares/ares-db-store';
import { threatForecastTriggerSchema } from '@/lib/validation/ares-schemas';

export const GET = withDPoP(
  requireAuth(async () => {
    const store = AresDbStore.getInstance();
    const alertSystem = PredictiveAlertSystem.getInstance();

    const historicalThreats = await store.listPredictiveThreats(25);
    const activeAlerts = alertSystem.getAlerts();

    return NextResponse.json({
      threats: historicalThreats,
      alerts: activeAlerts,
    });
  }, 'system:security:view'),
  { required: false }
);

export const POST = withDPoP(
  requireAuth(async (req: Request) => {
    const body = await req.json();
    const parsed = threatForecastTriggerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { category, evidenceSignals, affectedAssetIds } = parsed.data;
    const forecaster = ThreatForecaster.getInstance();
    const alertSystem = PredictiveAlertSystem.getInstance();
    const store = AresDbStore.getInstance();

    const formattedSignals = evidenceSignals.map((s) => ({
      signalId: s.signalId,
      source: s.source,
      signalType: s.signalType,
      weight: s.weight,
      observedValue: s.observedValue,
      timestamp: s.timestamp || new Date().toISOString(),
      metadata: s.metadata,
    }));

    const forecast = forecaster.generateForecast(category, formattedSignals, affectedAssetIds);
    await store.savePredictiveThreat(forecast);

    const alert = alertSystem.evaluateAndAlert(forecast, formattedSignals);

    return NextResponse.json({ forecast, alert });
  }, 'system:security:manage'),
  { required: false }
);
