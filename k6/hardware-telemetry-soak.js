import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, getAuthHeaders, generateTelemetryPayload } from './lib/auth-session.js';

export const telemetryDuration = new Trend('telemetry_ingest_duration_ms', true);
export const telemetryErrors = new Rate('telemetry_ingest_error_rate');
export const packetsIngested = new Counter('telemetry_packets_total');

export const options = {
  scenarios: {
    telemetry_soak: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 50 },    // Ramp-up
        { duration: '3m', target: 100 },   // Steady soak state
        { duration: '1m', target: 200 },   // 2x Peak morning rush burst
        { duration: '1m', target: 10 },    // Ramp-down & recovery
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<100', 'p(99)<200'],
    'telemetry_ingest_error_rate': ['rate<0.001'],
    'http_req_failed': ['rate<0.001'],
  },
};

export default function hardwareTelemetrySoak() {
  const vuId = __VU;
  const iter = __ITER;
  const deviceId = `dev_gw_${vuId % 20}_anchor`;
  const payload = JSON.stringify(generateTelemetryPayload(deviceId, iter));

  const params = {
    headers: getAuthHeaders('admin'),
    tags: { name: 'POST /api/hardware/telemetry/ingest' },
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/hardware/telemetry/ingest`, payload, params);
  const duration = Date.now() - start;

  telemetryDuration.add(duration);
  const success = check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'has buffered status': (r) => r.body && r.body.includes('buffered'),
  });

  if (success) {
    packetsIngested.add(1);
    telemetryErrors.add(0);
  } else {
    telemetryErrors.add(1);
  }

  // Throttle to simulated 50-100 packets/sec per worker
  sleep(0.02);
}
