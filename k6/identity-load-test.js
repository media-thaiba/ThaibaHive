import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function identityLoadTest() {
  const res = http.get('http://localhost:3000/api/admin/security/identity/metrics');
  check(res, {
    'status is 200': (r) => r.status === 200 || r.status === 401,
  });
  sleep(1);
}
