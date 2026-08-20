import { RtlsEngine, BleBeaconSignal } from '../../../operations/twin/assets/rtls-engine';

describe('RTLS Engine & BLE Trilateration', () => {
  beforeEach(() => {
    RtlsEngine.clearHistory();
  });

  it('should compute distance from RSSI using log-distance path loss', () => {
    const dist1m = RtlsEngine.rssiToDistance(-59, -59, 2.0);
    expect(dist1m).toBe(1.0);

    const distClose = RtlsEngine.rssiToDistance(-50, -59, 2.0);
    expect(distClose).toBeLessThan(1.0);

    const distFar = RtlsEngine.rssiToDistance(-80, -59, 2.0);
    expect(distFar).toBeGreaterThan(5.0);
  });

  it('should estimate asset position with multilateration from 4 gateway signals', () => {
    const gateways: BleBeaconSignal[] = [
      { gatewayId: 'GW1', gatewayPosition: { x: 0, y: 0, z: 3.5 }, rssi: -62 },
      { gatewayId: 'GW2', gatewayPosition: { x: 10, y: 0, z: 3.5 }, rssi: -62 },
      { gatewayId: 'GW3', gatewayPosition: { x: 0, y: 10, z: 3.5 }, rssi: -62 },
      { gatewayId: 'GW4', gatewayPosition: { x: 10, y: 10, z: 3.5 }, rssi: -62 },
    ];

    const result = RtlsEngine.computeTrilateration('TAG-MICROSCOPE-01', gateways);
    expect(result.assetTag).toBe('TAG-MICROSCOPE-01');
    // Center of four symmetric beacons (0,0), (10,0), (0,10), (10,10) is (5, 5)
    expect(result.estimatedPosition.x).toBeCloseTo(5.0, 0);
    expect(result.estimatedPosition.y).toBeCloseTo(5.0, 0);
    expect(result.accuracyRadiusMeters).toBeLessThanOrEqual(2.0);
    expect(result.floorLevel).toBe(1);
  });
});
