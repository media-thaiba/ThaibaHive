import { VisionDbStore } from '../../../db/vision-store';
import { CapAlertPayload, ThreatSeverity, ThreatType, AlertStatus, IncidentStatus } from '../vision-types';
import { ThreatScoringMatrix, ThreatScoringInput } from './threat-scoring-matrix';
import * as crypto from 'crypto';

export interface ProcessThreatAlertParams {
  alertId?: string;
  cameraId: string;
  zoneId?: string;
  threatType: ThreatType;
  confidenceScore: number;
  boundingPolygon?: { x: number; y: number }[];
  snapshotUrl?: string;
  facilityId: string;
  spaceId?: string;
  isAfterHours?: boolean;
  crowdPresent?: boolean;
  isHighSecurityZone?: boolean;
  institutionId?: string;
}

export class IncidentLedgerEngine {
  private dbStore: VisionDbStore;
  private recentAlertsWindow: Map<string, { timestamp: number; alertId: string }> = new Map();
  private readonly DEDUP_WINDOW_MS = 30000; // 30 seconds

  constructor(dbStore?: VisionDbStore) {
    this.dbStore = dbStore || VisionDbStore.getInstance();
  }

  public async processThreatAlert(params: ProcessThreatAlertParams): Promise<{
    alert: any;
    isDeduplicated: boolean;
    autoCreatedIncident?: any;
  }> {
    const tenantId = params.institutionId || 'global';
    const dedupKey = `${tenantId}:${params.cameraId}:${params.zoneId || 'all'}:${params.threatType}`;
    const now = Date.now();

    const recent = this.recentAlertsWindow.get(dedupKey);
    if (recent && now - recent.timestamp < this.DEDUP_WINDOW_MS) {
      const existingAlert = await this.dbStore.getThreatAlertById(recent.alertId, tenantId);
      return { alert: existingAlert, isDeduplicated: true };
    }

    const scoring = ThreatScoringMatrix.calculateThreatScore({
      threatType: params.threatType,
      confidenceScore: params.confidenceScore,
      isAfterHours: params.isAfterHours,
      crowdPresent: params.crowdPresent,
      isHighSecurityZone: params.isHighSecurityZone,
    });

    const alertId = params.alertId || `alt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const auditHash = crypto
      .createHash('sha256')
      .update(`${alertId}:${params.cameraId}:${params.threatType}:${scoring.severity}:${new Date().toISOString()}`)
      .digest('hex');

    const alertRecord = await this.dbStore.recordThreatAlert({
      alertId,
      cameraId: params.cameraId,
      zoneId: params.zoneId,
      threatType: params.threatType,
      severity: scoring.severity,
      confidenceScore: params.confidenceScore,
      boundingPolygonJson: JSON.stringify(params.boundingPolygon || []),
      snapshotUrl: params.snapshotUrl,
      status: 'active',
      detectedAt: new Date().toISOString(),
      auditHash,
      institutionId: tenantId,
    });

    this.recentAlertsWindow.set(dedupKey, { timestamp: now, alertId });

    let autoCreatedIncident = undefined;
    if (scoring.severity === 'critical' || scoring.severity === 'high') {
      autoCreatedIncident = await this.createIncidentFromAlert(alertRecord, params.facilityId, params.spaceId, tenantId);
    }

    return { alert: alertRecord, isDeduplicated: false, autoCreatedIncident };
  }

  public async createIncidentFromAlert(
    alert: any,
    facilityId: string,
    spaceId?: string,
    tenantId: string = 'global'
  ): Promise<any> {
    const incidentId = `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const title = `Auto-Escalated Incident: ${alert.threatType.replace(/_/g, ' ').toUpperCase()}`;
    const description = `Automated threat alert ${alert.alertId} escalated to security incident. Severity: ${alert.severity}, Camera: ${alert.cameraId}.`;

    const capPayload = this.buildCapPayload(incidentId, title, description, alert.severity, alert.threatType, facilityId);

    const incident = await this.dbStore.createSecurityIncident({
      incidentId,
      title,
      description,
      threatType: alert.threatType,
      severity: alert.severity,
      facilityId,
      spaceId,
      status: 'open',
      capJson: JSON.stringify(capPayload),
      merkleRoot: alert.auditHash,
      occurredAt: alert.detectedAt,
      institutionId: tenantId,
    });

    await this.dbStore.updateThreatAlert(alert.alertId, { status: 'triaged' }, tenantId);

    return incident;
  }

  public buildCapPayload(
    incidentId: string,
    headline: string,
    description: string,
    severity: ThreatSeverity,
    threatType: ThreatType,
    facilityId: string
  ): CapAlertPayload {
    const severityMap: Record<ThreatSeverity, CapAlertPayload['info']['severity']> = {
      critical: 'Extreme',
      high: 'Severe',
      medium: 'Moderate',
      low: 'Minor',
      informational: 'Minor',
    };

    return {
      identifier: incidentId,
      sender: 'vision-shield@thaibahive.internal',
      sent: new Date().toISOString(),
      status: 'Actual',
      msgType: 'Alert',
      scope: 'Restricted',
      info: {
        category: 'Security',
        event: threatType,
        urgency: severity === 'critical' ? 'Immediate' : 'Expected',
        severity: severityMap[severity],
        certainty: 'Observed',
        headline,
        description,
        area: {
          areaDesc: `Campus Facility: ${facilityId}`,
        },
      },
    };
  }

  public async transitionIncidentStatus(
    incidentId: string,
    newStatus: IncidentStatus,
    leadGuardId?: string,
    tenantId: string = 'global'
  ): Promise<any> {
    const existing = await this.dbStore.getSecurityIncidentById(incidentId, tenantId);
    if (!existing) throw new Error(`Incident ${incidentId} not found`);

    const updates: any = { status: newStatus };
    if (leadGuardId) updates.leadGuardId = leadGuardId;
    if (newStatus === 'contained') updates.containedAt = new Date().toISOString();
    if (newStatus === 'closed' || newStatus === 'resolved') updates.closedAt = new Date().toISOString();

    return this.dbStore.updateSecurityIncident(incidentId, updates, tenantId);
  }
}
