import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    ddos_burst: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '10s', target: 200 },
        { duration: '20s', target: 1000 }, // 1,000 RPS burst
        { duration: '15s', target: 100 },
        { duration: '5s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // <1% unhandled server errors (429 is not considered an unhandled failure)
    http_req_duration: ['p(95)<100'], // p95 response time under 100ms
  },
};

export default function ddosBurstTest() {
  const randomIp = `198.51.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  const params = {
    headers: {
      'x-forwarded-for': randomIp,
      'Content-Type': 'application/json',
    },
  };

  const res = http.get('http://localhost:3000/api/system/metrics', params);
  check(res, {
    'status is handled (200, 429, or 403)': (r) => [200, 429, 403, 401].includes(r.status),
    'no unhandled 500 error': (r) => r.status !== 500,
  });
}
