import { RiskSignal, RiskLevel, RiskScore } from './risk-signals';
import { lookupIP, computeGeoImpossibility } from './geo-lookup';

interface RiskEngineParams {
  userId: string;
  ip: string;
  deviceTrustScore: number;
  previousLoginIp?: string;
  previousLoginTime?: number;
  failedAttempts?: number;
}

const ipVelocityCache = new Map<string, { ips: string[], timestamp: number }>();
const VELOCITY_WINDOW_MS = 15 * 60 * 1000;

export async function evaluateRisk(params: RiskEngineParams): Promise<RiskScore> {
  let score = 0;
  const triggers: RiskSignal[] = [];

  // IP velocity
  const now = Date.now();
  const velocityData = ipVelocityCache.get(params.userId);
  let userIps: string[] = [];
  
  if (velocityData && now - velocityData.timestamp < VELOCITY_WINDOW_MS) {
    userIps = velocityData.ips;
  }
  
  if (!userIps.includes(params.ip)) {
    userIps.push(params.ip);
  }
  
  ipVelocityCache.set(params.userId, { ips: userIps, timestamp: now });

  if (userIps.length >= 3) {
    score += 30;
    triggers.push('ip_velocity');
  }

  // Geo impossibility
  if (params.previousLoginIp && params.previousLoginTime && params.previousLoginIp !== params.ip) {
    const prevLoc = await lookupIP(params.previousLoginIp);
    const currLoc = await lookupIP(params.ip);
    
    if (prevLoc && currLoc) {
      const timeDelta = now - params.previousLoginTime;
      if (computeGeoImpossibility(prevLoc, currLoc, timeDelta)) {
        score += 40;
        triggers.push('geo_impossibility');
      }
    }
  }

  // Device drift
  if (params.deviceTrustScore < 50) {
    score += 25;
    if (!triggers.includes('device_drift')) triggers.push('device_drift');
  } else if (params.deviceTrustScore < 70) {
    score += 10;
    if (!triggers.includes('device_drift')) triggers.push('device_drift');
  }

  // Failed attempts
  if (params.failedAttempts) {
    if (params.failedAttempts >= 5) {
      score += 35;
      triggers.push('failed_attempts');
    } else if (params.failedAttempts >= 3) {
      score += 20;
      triggers.push('failed_attempts');
    }
  }

  // Time anomaly
  const localHour = new Date().getHours();
  if (localHour < 6 || localHour > 22) {
    score += 5;
    triggers.push('time_anomaly');
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Map to level
  let level: RiskLevel = 'low';
  if (score > 80) level = 'critical';
  else if (score > 50) level = 'high';
  else if (score > 20) level = 'medium';

  return { score, level, triggers };
}
