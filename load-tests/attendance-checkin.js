import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const failedRequests = new Rate('failed_requests');

export const options = {
  scenarios: {
    concurrent_checkins: {
      executor: 'constant-vus',
      vus: parseInt(__ENV.VUS || '50', 10),
      duration: __ENV.DURATION || '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    failed_requests: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export default function attendanceCheckInTest() {
  const res = http.post(
    `${BASE_URL}/api/attendance/check-in`,
    JSON.stringify({
      method: 'nfc',
      nfcTagId: 'test-nfc-tag-id-99',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
        Cookie: `thaibahive_session=${AUTH_TOKEN}`,
      },
    }
  );

  const isSuccess = res.status === 200 || res.status === 201 || (res.status === 400 && res.body && res.body.includes("Already checked in today"));
  failedRequests.add(!isSuccess);

  check(res, {
    'status is 200, 201 or 400': () => isSuccess,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(0.1);
}
