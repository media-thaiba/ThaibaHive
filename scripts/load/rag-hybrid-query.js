import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const ragRequests = new Counter('rag_requests_total');
const ragQueryLatency = new Trend('rag_query_latency');
const ragErrors = new Rate('rag_errors');
const ragResultsCount = new Trend('rag_results_count');

export const options = {
  scenarios: {
    rag_hybrid_search_load: {
      executor: 'constant-arrival-rate',
      rate: 200, // 200 RPS
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 120,
    },
  },
  thresholds: {
    'rag_query_latency': ['p(95)<250', 'p(99)<600'],
    'rag_errors': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = __ENV.JWT_TOKEN || '';

const RAG_TEST_QUERIES = [
  'What is the campus emergency lockdown protocol?',
  'Faculty leave entitlement and rollover rules for 2026',
  'Hostel visitor timings and overnight stay policy',
  'Chemistry laboratory hazardous material handling guidelines',
  'Student scholarship eligibility and minimum GPA requirements',
  'Bus transport route 4 morning pickup schedule',
  'Tuition fee refund policy upon course withdrawal',
  'Examination revaluation and grading appeal procedure',
];

function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Cookie': `thaibahive_session=${JWT_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

export default function runRagHybridQuery() {
  const headers = getAuthHeaders();
  const query = RAG_TEST_QUERIES[Math.floor(Math.random() * RAG_TEST_QUERIES.length)];

  const payload = JSON.stringify({
    query,
    topK: 5,
    vectorWeight: 0.7,
    keywordWeight: 0.3,
    minScore: 0.3,
  });

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/ai/rag/query`, payload, {
    headers,
    timeout: '10s',
  });
  const latency = Date.now() - start;

  ragQueryLatency.add(latency);
  ragRequests.add(1);

  const success = check(res, {
    'RAG query status 200': (r) => r.status === 200,
    'RAG returns matches array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.matches);
      } catch {
        return false;
      }
    },
    'RAG includes search metadata': (r) => {
      try {
        const data = JSON.parse(r.body);
        return typeof data.query === 'string' && typeof data.totalMatches === 'number';
      } catch {
        return false;
      }
    },
  });

  if (success) {
    try {
      const data = JSON.parse(res.body);
      ragResultsCount.add(data.matches?.length || 0);
    } catch {}
  } else {
    ragErrors.add(1);
  }

  sleep(Math.random() * 0.3);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'rag-load-summary.json': JSON.stringify(data),
  };
}

function textSummary(data) {
  return `RAG Hybrid Query Load Test Summary\n${JSON.stringify(data.metrics, null, 2)}`;
}
