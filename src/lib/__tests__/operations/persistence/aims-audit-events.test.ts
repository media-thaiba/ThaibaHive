import { AimsAuditTrail } from '@/lib/operations/persistence/aims-audit-events';

describe('AIMS-019 — AimsAuditTrail', () => {
  it('should emit audit blocks with SHA-256 Merkle chain integrity and verify unbroken continuity', () => {
    const trail = new AimsAuditTrail();

    trail.emitEvent('AIMS_ENERGY_OPTIMIZED', 'hvac_agent', 'campus_main', 'inst_001', {
      zoneId: 'hall_101',
      deltaCelsius: 2.0,
      projectedKwhSavings: 14.5,
    });

    trail.emitEvent('AIMS_FLEET_DISPATCHED', 'fleet_router', 'campus_main', 'inst_001', {
      routeId: 'route_99',
      vehicleId: 'shuttle_1',
      totalDistanceKm: 12.4,
    });

    trail.emitEvent('AIMS_BIOMETRIC_ATTENDANCE_VERIFIED', 'edge_kiosk_1', 'campus_main', 'inst_001', {
      userId: 'user_std_88',
      sessionId: 'morning_0800',
      queryEmbedding: [0.1, 0.2, 0.3], // Should be redacted in clean payload
    });

    expect(trail.getBlockCount()).toBe(3);
    expect(trail.verifyChainIntegrity()).toBe(true);
  });
});
