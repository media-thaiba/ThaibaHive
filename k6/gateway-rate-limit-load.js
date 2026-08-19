import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<50'], // sub-50ms p95 under standard load
  },
};

export default function gatewayRateLimitLoad() {
  const clientIp = '203.0.113.15'; // Fixed IP to test rate-limit counter accumulation
  const params = {
    headers: {
      'x-forwarded-for': clientIp,
      'Content-Type': 'application/json',
    },
  };

  const res = http.get('http://localhost:3000/api/system/metrics', params);
  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'has ratelimit headers': (r) => r.headers['Ratelimit-Limit'] !== undefined || r.headers['ratelimit-limit'] !== undefined,
  });

  sleep(0.05); // 20 RPS per VU
}
