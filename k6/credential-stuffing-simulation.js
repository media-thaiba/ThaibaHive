import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '20s',
};

export default function credentialStuffingSimulation() {
  const attackingIp = '198.51.100.99';
  const payload = JSON.stringify({
    email: `victim_${Math.floor(Math.random() * 1000)}@thaibahive.org`,
    password: 'Password123!',
  });

  const params = {
    headers: {
      'x-forwarded-for': attackingIp,
      'Content-Type': 'application/json',
    },
  };

  const res = http.post('http://localhost:3000/api/auth/login', payload, params);
  check(res, {
    'request is handled or throttled or banned': (r) => [200, 400, 401, 403, 429].includes(r.status),
  });

  sleep(0.1);
}
