import { evaluateRisk } from '../../identity/risk-engine';
import { lookupIP, computeGeoImpossibility } from '../../identity/geo-lookup';

jest.mock('../../identity/geo-lookup', () => ({
  ...jest.requireActual('../../identity/geo-lookup'),
  lookupIP: jest.fn(),
}));

describe('Risk Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return low risk for normal login', async () => {
    const result = await evaluateRisk({
      userId: 'user1',
      ip: '192.168.1.1',
      deviceTrustScore: 100,
    });
    
    // Might have time anomaly depending on run time, handle that
    expect(result.level).toBe('low');
  });

  it('should detect device drift', async () => {
    const result = await evaluateRisk({
      userId: 'user2',
      ip: '192.168.1.1',
      deviceTrustScore: 40,
    });
    
    expect(result.score).toBeGreaterThanOrEqual(25);
    expect(result.triggers).toContain('device_drift');
  });

  it('should detect failed attempts', async () => {
    const result = await evaluateRisk({
      userId: 'user3',
      ip: '192.168.1.1',
      deviceTrustScore: 100,
      failedAttempts: 4
    });
    
    expect(result.score).toBeGreaterThanOrEqual(20);
    expect(result.triggers).toContain('failed_attempts');
  });

  it('should detect geo impossibility', async () => {
    (lookupIP as jest.Mock)
      .mockResolvedValueOnce({ lat: 40.7128, lon: -74.0060 }) // NY
      .mockResolvedValueOnce({ lat: 51.5074, lon: -0.1278 }); // London

    const result = await evaluateRisk({
      userId: 'user4',
      ip: '2.2.2.2',
      deviceTrustScore: 100,
      previousLoginIp: '1.1.1.1',
      previousLoginTime: Date.now() - 1000 * 60 * 60 // 1 hour ago
    });
    
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.triggers).toContain('geo_impossibility');
  });

  it('should evaluate critical risk when multiple high-severity signals compound', async () => {
    (lookupIP as jest.Mock)
      .mockResolvedValueOnce({ lat: 40.7128, lon: -74.0060 })
      .mockResolvedValueOnce({ lat: 51.5074, lon: -0.1278 });

    const result = await evaluateRisk({
      userId: 'user_critical',
      ip: '2.2.2.2',
      deviceTrustScore: 30, // +25 drift
      failedAttempts: 6,    // +35 failed attempts
      previousLoginIp: '1.1.1.1',
      previousLoginTime: Date.now() - 1000 * 60 * 30, // +40 geo impossibility
    });

    expect(result.score).toBeGreaterThan(80);
    expect(result.level).toBe('critical');
    expect(result.triggers).toContain('geo_impossibility');
    expect(result.triggers).toContain('device_drift');
    expect(result.triggers).toContain('failed_attempts');
  });
});

describe('Geo Lookup', () => {
  it('should compute geo impossibility correctly', () => {
    const ny = { lat: 40.7128, lon: -74.0060, ip: '', country: '', region: '', isp: '' };
    const london = { lat: 51.5074, lon: -0.1278, ip: '', country: '', region: '', isp: '' };
    
    // NY to London is ~5500 km
    expect(computeGeoImpossibility(ny, london, 1000 * 60 * 60 * 2)).toBe(true); // 2 hours = impossible
    expect(computeGeoImpossibility(ny, london, 1000 * 60 * 60 * 10)).toBe(false); // 10 hours = possible
  });
});
