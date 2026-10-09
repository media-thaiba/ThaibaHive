import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const searchRequests = new Counter('search_requests_total');
const searchLatency = new Trend('search_latency');
const searchErrors = new Rate('search_errors');
const searchResults = new Trend('search_results_count');

export const options = {
  scenarios: {
    search_api_load: {
      executor: 'constant-arrival-rate',
      rate: 200,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },
  thresholds: {
    'search_latency': ['p(95)<200', 'p(99)<500'],
    'search_errors': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = __ENV.JWT_TOKEN || '';

const SEARCH_QUERIES = [
  'student', 'staff', 'fee', 'attendance', 'leave', 'task',
  'announcement', 'event', 'circular', 'report', 'approval',
  'asset', 'vehicle', 'canteen', 'message', 'channel',
];

function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Cookie': `thaibahive_session=${JWT_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

export default function () {
  const headers = getAuthHeaders();
  const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
  const limit = Math.floor(Math.random() * 20) + 5;

  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
    headers,
    timeout: '10s',
  });
  const latency = Date.now() - start;

  searchLatency.add(latency);
  searchRequests.add(1);

  const success = check(res, {
    'Search status 200': (r) => r.status === 200,
    'Search has results array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.results);
      } catch {
        return false;
      }
    },
  });

  if (success) {
    try {
      const data = JSON.parse(res.body);
      searchResults.add(data.results?.length || 0);
    } catch {}
  } else {
    searchErrors.add(1);
  }

  sleep(Math.random() * 0.5);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'search-load-summary.json': JSON.stringify(data),
  };
}

function textSummary(data) {
  return `Search API Load Test Summary\n${JSON.stringify(data.metrics, null, 2)}`;
}