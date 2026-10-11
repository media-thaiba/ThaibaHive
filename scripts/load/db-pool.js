import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

const dbPoolWaitTime = new Trend('db_pool_wait_time_ms');
const dbPoolUtilization = new Gauge('db_pool_utilization_percent');
const dbQueryErrors = new Rate('db_query_errors');
const dbQueriesTotal = new Counter('db_queries_total');

export const options = {
  scenarios: {
    db_pool_saturation: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '3m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '2m', target: 0 },
      ],
    },
  },
  thresholds: {
    'db_pool_wait_time_ms': ['p(95)<1000'],
    'db_query_errors': ['rate<0.001'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = __ENV.JWT_TOKEN || '';

function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Cookie': `thaibahive_session=${JWT_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

export default function runDbPool() {
  const headers = getAuthHeaders();

  // Execute multiple queries to stress connection pool
  const queries = [
    () => http.get(`${BASE_URL}/api/students?limit=50`, { headers }),
    () => http.get(`${BASE_URL}/api/staff?limit=50`, { headers }),
    () => http.get(`${BASE_URL}/api/chat/channels?limit=20`, { headers }),
    () => http.get(`${BASE_URL}/api/attendance/today`, { headers }),
    () => http.get(`${BASE_URL}/api/announcements?limit=20`, { headers }),
  ];

  const queryFn = queries[Math.floor(Math.random() * queries.length)];
  const start = Date.now();
  const res = queryFn();
  const latency = Date.now() - start;

  dbQueriesTotal.add(1);
  dbPoolWaitTime.add(latency);

  const success = check(res, {
    'Query status 200': (_r) => _r.status === 200,
    'Query latency < 500ms': () => latency < 500,
  });

  if (!success) {
    dbQueryErrors.add(1);
  }

  // Extract pool utilization from response headers if available
  const poolUtil = res.headers['X-DB-Pool-Utilization'];
  if (poolUtil) {
    dbPoolUtilization.add(parseFloat(poolUtil));
  }

  sleep(Math.random() * 0.2);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'db-pool-summary.json': JSON.stringify(data),
  };
}

function textSummary(data) {
  return `Database Pool Saturation Test Summary\n${JSON.stringify(data.metrics, null, 2)}`;
}