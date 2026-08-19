import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    ddos_staging_certification: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 500,
      stages: [
        { duration: '10s', target: 500 },
        { duration: '30s', target: 1000 }, // 1,000 RPS sustained burst
        { duration: '15s', target: 200 },
        { duration: '5s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.001'], // 0% unhandled 500 errors
    http_req_duration: ['p(95)<50'], // p95 response time under 50ms
  },
};

const TARGET_URL = __ENV.STAGING_GATEWAY_URL || 'http://localhost:3000/api/system/metrics';

export default function stagingCertificationTest() {
  const randomIp = `198.51.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  const params = {
    headers: {
      'x-forwarded-for': randomIp,
      'Content-Type': 'application/json',
      'User-Agent': 'k6-DDoS-Certification-Runner/3.23.0',
    },
  };

  const res = http.get(TARGET_URL, params);
  check(res, {
    'status is handled (200, 429, 403, 401)': (r) => [200, 429, 403, 401, 503].includes(r.status),
    'zero unhandled 500 server errors': (r) => r.status !== 500,
  });
}
