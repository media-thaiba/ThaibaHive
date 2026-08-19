import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '30s',
};

export default function revocationLoadTest() {
  const payload = JSON.stringify({
    userId: 'user_1',
    sessionId: `session_${Math.random()}`,
    reason: 'load test'
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post('http://localhost:3000/api/auth/revoke', payload, params);
  check(res, {
    'status is valid': (r) => [200, 401, 403].includes(r.status),
  });
  sleep(0.5);
}
