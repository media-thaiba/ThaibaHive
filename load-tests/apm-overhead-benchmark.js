import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const failedRequests = new Rate('failed_requests');

export const options = {
  scenarios: {
    baseline_health: {
      executor: 'constant-vus',
      vus: parseInt(__ENV.VUS || '25', 10),
      duration: __ENV.DURATION || '10s',
      exec: 'baselineHealthScenario',
    },
    apm_instrumented_metrics: {
      executor: 'constant-vus',
      vus: parseInt(__ENV.VUS || '25', 10),
      duration: __ENV.DURATION || '10s',
      exec: 'apmMetricsScenario',
      startTime: '2s',
    },
  },
  thresholds: {
    'http_req_duration{scenario:baseline_health}': ['p(95)<250'],
    'http_req_duration{scenario:apm_instrumented_metrics}': ['p(95)<250', 'p(99)<500'],
    failed_requests: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${AUTH_TOKEN}`,
  Cookie: `thaibahive_session=${AUTH_TOKEN}`,
};

export function baselineHealthScenario() {
  const res = http.get(`${BASE_URL}/api/system/health`, { headers });
  const hasLatencyHeader = res.headers['X-Response-Time'] || res.headers['x-response-time'];
  const isOk = res.status === 200;
  failedRequests.add(!isOk);

  check(res, {
    'health status is 200': () => isOk,
    'x-response-time header present': () => Boolean(hasLatencyHeader),
    'health duration < 250ms': (r) => r.timings.duration < 250,
  });

  sleep(0.05);
}

export function apmMetricsScenario() {
  const res = http.get(`${BASE_URL}/api/system/metrics?window=5m`, { headers });
  const isOk = res.status === 200;
  failedRequests.add(!isOk);

  check(res, {
    'metrics status is 200': () => isOk,
    'metrics duration < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(0.05);
}

export default function apmBenchmark() {
  baselineHealthScenario();
}
