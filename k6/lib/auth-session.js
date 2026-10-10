import http from 'k6/http';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const INSTITUTION_ID = __ENV.INSTITUTION_ID || 'inst_soak_alpha';

/**
 * Returns authentication headers for simulated admin or edge devices
 */
export function getAuthHeaders(role = 'admin') {
  return {
    'Content-Type': 'application/json',
    'x-institution-id': INSTITUTION_ID,
    'x-user-role': role,
    'x-simulated-auth': 'soak-test-runner',
  };
}

/**
 * Generates synthetic telemetry payload
 */
export function generateTelemetryPayload(deviceId, index) {
  return {
    deviceId: deviceId,
    logType: index % 5 === 0 ? 'heartbeat' : 'rssi_scan',
    rssi: -50 - (Math.random() * 40),
    snr: 15.0 + (Math.random() * 10),
    batteryLevel: Math.floor(20 + (Math.random() * 80)),
    temperatureCelsius: 22.0 + (Math.random() * 8.0),
    humidityPercent: 45.0 + (Math.random() * 15.0),
    packetLossPercent: Math.random() * 2.0,
    firmwareVersion: '1.0.0',
    timestamp: new Date().toISOString(),
  };
}
