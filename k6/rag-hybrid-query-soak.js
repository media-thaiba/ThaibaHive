import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, getAuthHeaders } from './lib/auth-session.js';

export const ragLatency = new Trend('rag_query_duration_ms', true);
export const ragErrors = new Rate('rag_query_error_rate');
export const ragQueriesTotal = new Counter('rag_queries_total');

export const options = {
  scenarios: {
    rag_query_soak: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 5 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<250', 'p(99)<400'],
    'rag_query_error_rate': ['rate<0.005'],
    'http_req_failed': ['rate<0.005'],
  },
};

const queryPool = [
  "What is the campus emergency evacuation procedure for building A?",
  "What are the attendance policy requirements for semester 2 examinations?",
  "How to submit purchase requisition for laboratory equipment?",
  "Where are designated muster points located on campus?",
  "What is the procedure for sick leave application?",
];

export default function ragHybridQuerySoak() {
  const query = queryPool[Math.floor(Math.random() * queryPool.length)];

  const payload = JSON.stringify({
    query: query,
    topK: 5,
    minScore: 0.6,
  });

  const params = {
    headers: getAuthHeaders('staff'),
    tags: { name: 'POST /api/ai/rag/query' },
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/ai/rag/query`, payload, params);
  const duration = Date.now() - start;

  ragLatency.add(duration);
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has results array': (r) => r.body && (r.body.includes('results') || r.body.includes('matches') || r.body.includes('data')),
  });

  if (success) {
    ragQueriesTotal.add(1);
    ragErrors.add(0);
  } else {
    ragErrors.add(1);
  }

  sleep(0.1);
}
