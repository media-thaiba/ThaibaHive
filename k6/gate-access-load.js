import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, getAuthHeaders } from './lib/auth-session.js';

export const gateLatency = new Trend('gate_transit_duration_ms', true);
export const gateErrors = new Rate('gate_error_rate');
export const gateTransitsTotal = new Counter('gate_transits_total');

export const options = {
  scenarios: {
    gate_rush_load: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '1m', target: 250 }, // Morning rush burst
        { duration: '1m', target: 10 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<80', 'p(99)<150'], // Target sub-50ms p95
    'gate_error_rate': ['rate<0.001'],
    'http_req_failed': ['rate<0.001'],
  },
};

export default function gateAccessLoad() {
  const vuId = __VU;
  const iter = __ITER;
  const badgeId = `NFC_SOAK_USER_${vuId}_${iter % 10}`;
  const deviceId = `dev_turnstile_${(vuId % 6) + 1}`;
  const direction = iter % 2 === 0 ? 'in' : 'out'; // Alternating entry/exit to satisfy APB

  const payload = JSON.stringify({
    badgeId: badgeId,
    deviceId: deviceId,
    direction: direction,
    authenticationMethod: 'nfc',
  });

  const params = {
    headers: getAuthHeaders('admin'),
    tags: { name: 'POST /api/hardware/access-control/verify' },
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/hardware/access-control/verify`, payload, params);
  const duration = Date.now() - start;

  gateLatency.add(duration);
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has verification decision': (r) => r.body && (r.body.includes('granted') || r.body.includes('verificationResult')),
  });

  if (success) {
    gateTransitsTotal.add(1);
    gateErrors.add(0);
  } else {
    gateErrors.add(1);
  }

  sleep(0.05);
}
