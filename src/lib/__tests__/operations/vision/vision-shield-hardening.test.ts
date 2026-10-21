/**
 * @jest-environment node
 *
 * SafeCampus OS & AI Vision Shield Hardening Suite
 * Covers:
 * - Camera lens occlusion / tampering detection & CAP incident auto-escalation
 * - ALPR blacklisted vehicle gate lock & critical threat alert generation
 * - ZoneIsolationMatrix auto-population & dynamic zone fail-safe egress
 * - Lockdown API validation (facility/zone requirements, 400)
 * - Lockdown lifecycle terminal guards (lift non-existent 404, double-lift 409)
 */

import { CameraGatewayAdapter } from '@/lib/operations/vision/ingestion/camera-gateway-adapter';
import { StreamHealthMonitor } from '@/lib/operations/vision/ingestion/stream-health-monitor';
import { GateAccessController } from '@/lib/operations/vision/alpr/gate-access-controller';
import { LockdownOrchestrator } from '@/lib/operations/vision/emergency/lockdown-orchestrator';
import { ZoneIsolationMatrix } from '@/lib/operations/vision/emergency/zone-isolation-matrix';
import { EgressPathController } from '@/lib/operations/vision/emergency/egress-path-controller';
import { IncidentLedgerEngine } from '@/lib/operations/vision/incidents/incident-ledger-engine';
import { VisionDbStore } from '@/lib/db/vision-store';
import { POST as postAlpr } from '@/app/api/vision/alpr/route';
import { POST as postLockdown, GET as getLockdown } from '@/app/api/vision/lockdown/route';

jest.mock('@thaiba/auth', () => {
  const actual = jest.requireActual('@thaiba/auth');
  return {
    ...actual,
    verifySession: jest.fn().mockResolvedValue({
      staffId: 'usr_sec_admin',
      role: 'admin',
      institutionId: 'tenant_shield_alpha',
      email: 'secadmin@thaiba.edu',
      permissions: ['*'],
    }),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

describe('SafeCampus OS & Vision Shield Hardening Pipeline', () => {
  const tenantId = 'tenant_shield_alpha';
  let store: VisionDbStore;
  let healthMonitor: StreamHealthMonitor;
  let cameraAdapter: CameraGatewayAdapter;
  let incidentEngine: IncidentLedgerEngine;

  beforeEach(() => {
    store = VisionDbStore.getInstance();
    store.clearMemoryStore();
    healthMonitor = new StreamHealthMonitor();
    cameraAdapter = new CameraGatewayAdapter(healthMonitor, store);
    incidentEngine = new IncidentLedgerEngine(store);
  });

  describe('1. Camera Occlusion & Tamper Detection Pipeline', () => {
    it('detects lens occlusion (< 5.0 variance) and automatically dispatches camera_tampering threat alert', async () => {
      const cameraId = 'cam_perimeter_north';
      await store.createCamera({
        cameraId,
        name: 'North Perimeter Gate',
        facilityId: 'fac_main',
        streamUrl: 'rtsp://10.0.0.10:554/live',
        status: 'online',
        institutionId: tenantId,
      });

      // Report health with low luminance variance (covered/sprayed lens)
      const metrics = await cameraAdapter.reportCameraHealth(
        cameraId,
        {
          fps: 30,
          bitrateKbps: 4096,
          packetLossPercent: 0.1,
          latencyMs: 90,
          luminanceVariance: 2.1, // < 5.0 variance -> lens occlusion
          facilityId: 'fac_main',
        },
        tenantId,
        incidentEngine
      );

      expect(metrics.status).toBe('occluded');
      expect(metrics.isOccluded).toBe(true);

      // Verify camera status updated in store
      const updatedCam = await store.getCameraById(cameraId, tenantId);
      expect(updatedCam?.status).toBe('occluded');

      // Verify automated threat alert created
      const alerts = await store.listThreatAlerts(tenantId, undefined, 'camera_tampering');
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].threatType).toBe('camera_tampering');
      expect(alerts[0].severity).toBe('high');
      expect(alerts[0].status).toBe('triaged');
      expect(alerts[0].cameraId).toBe(cameraId);

      // High severity must auto-escalate to Security Incident
      const incidents = await store.listSecurityIncidents(tenantId);
      const tamperIncident = incidents.find((i) => i.threatType === 'camera_tampering');
      expect(tamperIncident).toBeDefined();
      expect(tamperIncident?.title).toContain('CAMERA TAMPERING');
    });

    it('does not dispatch tampering alert when luminance variance is normal', async () => {
      const cameraId = 'cam_quad_south';
      await store.createCamera({
        cameraId,
        name: 'South Quad Camera',
        facilityId: 'fac_main',
        streamUrl: 'rtsp://10.0.0.12:554/live',
        status: 'online',
        institutionId: tenantId,
      });

      const metrics = await cameraAdapter.reportCameraHealth(
        cameraId,
        {
          fps: 30,
          bitrateKbps: 4096,
          packetLossPercent: 0.0,
          latencyMs: 65,
          luminanceVariance: 48.5, // Healthy variance
          facilityId: 'fac_main',
        },
        tenantId,
        incidentEngine
      );

      expect(metrics.status).toBe('online');
      expect(metrics.isOccluded).toBe(false);

      const alerts = await store.listThreatAlerts(tenantId, 'active', 'camera_tampering');
      expect(alerts.length).toBe(0);
    });

    it('detects total stream loss (100% packet loss, 0 fps) and marks camera status directly as offline', async () => {
      const cameraId = 'cam_offline_test';
      await store.createCamera({
        cameraId,
        name: 'Offline Test Camera',
        facilityId: 'fac_main',
        streamUrl: 'rtsp://10.0.0.99:554/live',
        status: 'online',
        institutionId: tenantId,
      });

      const metrics = await cameraAdapter.reportCameraHealth(
        cameraId,
        {
          fps: 0,
          bitrateKbps: 0,
          packetLossPercent: 100,
          latencyMs: 1200,
          facilityId: 'fac_main',
        },
        tenantId,
        incidentEngine
      );

      expect(metrics.status).toBe('offline');
      const cam = await store.getCameraById(cameraId, tenantId);
      expect(cam?.status).toBe('offline');
    });
  });

  describe('2. ALPR Blacklist Gate Security & Incident Auto-Escalation', () => {
    it('blocks gate actuation and triggers critical blacklisted_vehicle threat alert on entry attempt', async () => {
      const blacklistedPlate = 'KL-07-CD-9999';

      // Register vehicle on security blacklist
      await store.createVehicleWhitelist({
        permitId: 'per_suspect_01',
        plateNumber: blacklistedPlate,
        ownerName: 'Flagged Suspect Vehicle',
        ownerType: 'vendor',
        validFrom: '2026-01-01',
        status: 'active',
        isBlacklisted: true,
        blacklistReason: 'Prior unauthorized security compound entry',
        institutionId: tenantId,
      });

      const req = new Request('http://localhost/api/vision/alpr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plateNumber: blacklistedPlate,
          confidenceScore: 0.98,
          direction: 'entry',
          gateId: 'gate_main_north',
          facilityId: 'fac_main',
          cameraId: 'cam_alpr_north_01',
          vehicleType: 'car',
        }),
      });

      const res = await postAlpr(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      // Gate actuation must be false
      expect(data.decision.gateActuated).toBe(false);
      expect(data.decision.isBlacklisted).toBe(true);
      expect(data.decision.permitStatus).toBe('blacklisted');

      // Threat alert must be returned and recorded
      expect(data.threatAlert).toBeDefined();
      expect(data.threatAlert.alert.threatType).toBe('blacklisted_vehicle');
      expect(data.threatAlert.alert.severity).toBe('critical');

      // Check incident ledger auto-creation
      const incidents = await store.listSecurityIncidents(tenantId);
      const vehicleIncident = incidents.find((i) => i.threatType === 'blacklisted_vehicle');
      expect(vehicleIncident).toBeDefined();
      expect(vehicleIncident?.severity).toBe('critical');
    });

    it('permits authorized staff vehicle entry and actuates gate barrier', async () => {
      const authorizedPlate = 'KL-11-AA-1234';

      await store.createVehicleWhitelist({
        permitId: 'per_staff_01',
        plateNumber: authorizedPlate,
        ownerName: 'Dr. Zameer Khan',
        ownerType: 'staff',
        validFrom: '2026-01-01',
        status: 'active',
        isBlacklisted: false,
        institutionId: tenantId,
      });

      const req = new Request('http://localhost/api/vision/alpr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plateNumber: authorizedPlate,
          confidenceScore: 0.99,
          direction: 'entry',
          gateId: 'gate_main_north',
          facilityId: 'fac_main',
          cameraId: 'cam_alpr_north_01',
          vehicleType: 'car',
        }),
      });

      const res = await postAlpr(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.decision.gateActuated).toBe(true);
      expect(data.decision.permitStatus).toBe('authorized_staff');
      expect(data.threatAlert).toBeUndefined();
    });

    it('prevents ALPR blacklist evasion by matching normalized plates across hyphens, spaces, and casing', async () => {
      const storedBlacklistPlate = 'DL 04 CD 7777';
      const scannedPlateVariant = 'dl-04-cd-7777';

      await store.createVehicleWhitelist({
        permitId: 'per_blacklisted_variant_01',
        plateNumber: storedBlacklistPlate,
        ownerName: 'Flagged Suspect',
        ownerType: 'vendor',
        validFrom: '2026-01-01',
        status: 'active',
        isBlacklisted: true,
        blacklistReason: 'Stolen vehicle alert cross-reference',
        institutionId: tenantId,
      });

      const gateController = new GateAccessController(store);
      const decision = await gateController.evaluateGateAccess(
        scannedPlateVariant,
        'gate_main',
        'fac_main',
        'entry',
        tenantId
      );

      expect(decision.isBlacklisted).toBe(true);
      expect(decision.gateActuated).toBe(false);
      expect(decision.permitStatus).toBe('blacklisted');
      expect(decision.reason).toMatch(/security blacklist/i);
    });

    it('rejects expired vehicle permits and denies gate actuation', async () => {
      const expiredPlate = 'MH-02-XY-9999';

      await store.createVehicleWhitelist({
        permitId: 'per_expired_student_01',
        plateNumber: expiredPlate,
        ownerName: 'Past Graduate',
        ownerType: 'student',
        validFrom: '2023-01-01',
        status: 'active',
        validTo: '2024-01-01T00:00:00.000Z',
        isBlacklisted: false,
        institutionId: tenantId,
      });

      const gateController = new GateAccessController(store);
      const decision = await gateController.evaluateGateAccess(
        expiredPlate,
        'gate_main',
        'fac_main',
        'entry',
        tenantId
      );

      expect(decision.isAuthorized).toBe(false);
      expect(decision.gateActuated).toBe(false);
      expect(decision.permitStatus).toBe('expired');
      expect(decision.reason).toMatch(/expired/i);
    });

    it('rejects suspended vehicle permits with explicit suspended status and denial reason', async () => {
      const suspendedPlate = 'KA-05-ZZ-1111';

      await store.createVehicleWhitelist({
        permitId: 'per_suspended_staff_01',
        plateNumber: suspendedPlate,
        ownerName: 'Suspended Staff Member',
        ownerType: 'staff',
        validFrom: '2026-01-01',
        status: 'suspended',
        isBlacklisted: false,
        institutionId: tenantId,
      });

      const gateController = new GateAccessController(store);
      const decision = await gateController.evaluateGateAccess(
        suspendedPlate,
        'gate_main',
        'fac_main',
        'entry',
        tenantId
      );

      expect(decision.isAuthorized).toBe(false);
      expect(decision.gateActuated).toBe(false);
      expect(decision.permitStatus).toBe('suspended');
      expect(decision.reason).toMatch(/suspended/i);
    });

    it('enforces parking capacity overflow blocking for regular vehicles while honoring staff exemptions', async () => {
      const facId = 'fac_lot_overflow_test';
      const gateController = new GateAccessController(store);
      gateController.getParkingIndexer().registerLot(facId, 1);

      // Student vehicle 1 fills the only spot
      await store.createVehicleWhitelist({
        permitId: 'per_student_spot_1',
        plateNumber: 'TN-01-AA-0001',
        ownerName: 'Student 1',
        ownerType: 'student',
        validFrom: '2026-01-01',
        status: 'active',
        institutionId: tenantId,
      });
      const d1 = await gateController.evaluateGateAccess('TN-01-AA-0001', 'gate_1', facId, 'entry', tenantId);
      expect(d1.gateActuated).toBe(true);

      // Student vehicle 2 arrives at full lot
      await store.createVehicleWhitelist({
        permitId: 'per_student_spot_2',
        plateNumber: 'TN-01-AA-0002',
        ownerName: 'Student 2',
        ownerType: 'student',
        validFrom: '2026-01-01',
        status: 'active',
        institutionId: tenantId,
      });
      const d2 = await gateController.evaluateGateAccess('TN-01-AA-0002', 'gate_1', facId, 'entry', tenantId);
      expect(d2.gateActuated).toBe(false);
      expect(d2.reason).toMatch(/maximum capacity/i);

      // Staff vehicle arrives at full lot -> authorized via staff exemption
      await store.createVehicleWhitelist({
        permitId: 'per_staff_override_1',
        plateNumber: 'TN-01-STAFF-99',
        ownerName: 'Dr. Faculty',
        ownerType: 'staff',
        validFrom: '2026-01-01',
        status: 'active',
        institutionId: tenantId,
      });
      const d3 = await gateController.evaluateGateAccess('TN-01-STAFF-99', 'gate_1', facId, 'entry', tenantId);
      expect(d3.gateActuated).toBe(true);
      expect(d3.permitStatus).toBe('authorized_staff');
    });
  });

  describe('3. Multi-Zone Isolation & Fail-Safe Egress Controller', () => {
    it('initializes default zones and correctly calculates doors locked on facility lockdown', async () => {
      const zoneMatrix = new ZoneIsolationMatrix();
      const egressController = new EgressPathController();
      const orchestrator = new LockdownOrchestrator(zoneMatrix, egressController, store);

      // Facility lockdown on fac_science
      const result = await orchestrator.triggerLockdown({
        scope: 'facility',
        targetFacilityId: 'fac_science',
        reason: 'Laboratory hazard emergency containment',
        triggeredByUserId: 'usr_sec_admin',
        tenantId,
      });

      expect(result.affectedZones.length).toBeGreaterThan(0);
      expect(result.doorsLockedCount).toBeGreaterThan(0);
      expect(result.egressPathsIlluminated).toBe(true);
      expect(result.merkleAuditHash).toHaveLength(64);

      // Verify lockdown stored in database
      const event = await store.getLockdownEventById(result.lockdownId, tenantId);
      expect(event?.status).toBe('active');
      expect(event?.scope).toBe('facility');
    });

    it('dynamically registers unknown zones with fail-safe egress door counts', async () => {
      const zoneMatrix = new ZoneIsolationMatrix();
      const egressController = new EgressPathController();
      const orchestrator = new LockdownOrchestrator(zoneMatrix, egressController, store);

      const result = await orchestrator.triggerLockdown({
        scope: 'zone',
        targetFacilityId: 'fac_research',
        targetZoneId: 'zone_quantum_cleanroom',
        reason: 'Cleanroom breach protocol',
        triggeredByUserId: 'usr_sec_admin',
        tenantId,
      });

      expect(result.affectedZones).toContain('zone_quantum_cleanroom');
      expect(result.doorsLockedCount).toBe(4);
      expect(result.egressPathsIlluminated).toBe(true);
    });
  });

  describe('4. Emergency Lockdown API Route Terminal Guards', () => {
    it('returns 400 when facility scope is requested without targetFacilityId', async () => {
      const req = new Request('http://localhost/api/vision/lockdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'facility',
          reason: 'Missing facility id',
        }),
      });

      const res = await postLockdown(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/targetFacilityId is required/i);
    });

    it('returns 400 when zone scope is requested without targetZoneId', async () => {
      const req = new Request('http://localhost/api/vision/lockdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'zone',
          targetFacilityId: 'fac_main',
          reason: 'Missing zone id',
        }),
      });

      const res = await postLockdown(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/targetZoneId is required/i);
    });

    it('returns 404 when attempting to lift a non-existent lockdown', async () => {
      const req = new Request('http://localhost/api/vision/lockdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'lift_lockdown',
          lockdownId: 'lck_non_existent_99999',
        }),
      });

      const res = await postLockdown(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toMatch(/Lockdown event not found/i);
    });

    it('returns 409 Conflict when attempting to lift an already cleared lockdown', async () => {
      // 1. Trigger valid lockdown
      const triggerReq = new Request('http://localhost/api/vision/lockdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'campus_wide',
          reason: 'Full campus drill',
        }),
      });
      const triggerRes = await postLockdown(triggerReq);
      expect(triggerRes.status).toBe(201);
      const { lockdownId } = await triggerRes.json();

      // 2. First lift -> 200 OK
      const liftReq1 = new Request('http://localhost/api/vision/lockdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'lift_lockdown',
          lockdownId,
        }),
      });
      const liftRes1 = await postLockdown(liftReq1);
      expect(liftRes1.status).toBe(200);
      const liftData = await liftRes1.json();
      expect(liftData.lockdown.status).toBe('all_clear');

      // 3. Second lift -> 409 Conflict (terminal guard)
      const liftReq2 = new Request('http://localhost/api/vision/lockdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'lift_lockdown',
          lockdownId,
        }),
      });
      const liftRes2 = await postLockdown(liftReq2);
      expect(liftRes2.status).toBe(409);
      const errData = await liftRes2.json();
      expect(errData.error).toMatch(/already been lifted/i);
    });

    it('rejects concurrent duplicate active lockdown for the same scope with 409 Conflict', async () => {
      // First active lockdown
      const req1 = new Request('http://localhost/api/vision/lockdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'campus_wide',
          reason: 'Severe perimeter breach',
        }),
      });
      const res1 = await postLockdown(req1);
      expect(res1.status).toBe(201);
      const { lockdownId } = await res1.json();

      try {
        // Second concurrent trigger for campus_wide
        const req2 = new Request('http://localhost/api/vision/lockdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scope: 'campus_wide',
            reason: 'Duplicate breach notification',
          }),
        });
        const res2 = await postLockdown(req2);
        expect(res2.status).toBe(409);
        const data2 = await res2.json();
        expect(data2.error).toMatch(/active lockdown already exists/i);
      } finally {
        // Cleanup: lift the first lockdown
        const cleanReq = new Request('http://localhost/api/vision/lockdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'lift_lockdown',
            lockdownId,
          }),
        });
        await postLockdown(cleanReq);
      }
    });

    it('generates cryptographic SHA-256 Merkle audit hash and logs actor ID on lockdown lift', async () => {
      const triggerReq = new Request('http://localhost/api/vision/lockdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'facility',
          targetFacilityId: 'fac_audit_test',
          reason: 'Audited evacuation drill',
        }),
      });
      const triggerRes = await postLockdown(triggerReq);
      expect(triggerRes.status).toBe(201);
      const { lockdownId } = await triggerRes.json();

      const liftReq = new Request('http://localhost/api/vision/lockdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'lift_lockdown',
          lockdownId,
          reason: 'All clear confirmed by on-site incident commander',
        }),
      });
      const liftRes = await postLockdown(liftReq);
      expect(liftRes.status).toBe(200);
      const data = await liftRes.json();

      expect(data.lockdown.status).toBe('all_clear');
      expect(data.lockdown.allClearAt).toBeDefined();
      expect(data.lockdown.allClearByUserId).toBe('usr_sec_admin');
      expect(data.lockdown.allClearMerkleAuditHash).toHaveLength(64);
      expect(data.lockdown.allClearMerkleAuditHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('locks doors properly when floor scope is selected in ZoneIsolationMatrix', () => {
      const zoneMatrix = new ZoneIsolationMatrix();
      zoneMatrix.registerZone('zone_floor_2_admin', 'fac_admin_fl2', 12);

      const result = zoneMatrix.lockZones('floor', 'fac_admin_fl2');
      expect(result.affectedZoneIds).toContain('zone_floor_2_admin');
      expect(result.totalDoorsLocked).toBeGreaterThanOrEqual(12);
    });
  });
});
