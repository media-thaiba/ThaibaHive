import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const sseConnections = new Rate('sse_connections');
const sseEventsReceived = new Rate('sse_events_received');
const sseReconnects = new Rate('sse_reconnects');
const sseLatency = new Trend('sse_latency');

export const options = {
  scenarios: {
    sse_flood: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 500 },
        { duration: '5m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'sse_connections': ['rate>0.90'],
    'sse_reconnects': ['rate<0.10'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = __ENV.JWT_TOKEN || '';

function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Cookie': `thaibahive_session=${JWT_TOKEN}`,
    'Accept': 'text/event-stream',
  };
}

export default function () {
  const headers = getAuthHeaders();
  const channels = [`test-channel-${__VU}-${__ITER}`, `announcements`, `general`].join(',');

  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/chat/sse?channels=${channels}`, {
    headers,
    timeout: '120s',
    responseType: 'stream',
  });

  const latency = Date.now() - start;
  sseLatency.add(latency);

  const connected = check(res, {
    'SSE connected': (r) => r.status === 200,
    'SSE content-type': (r) => r.headers['Content-Type']?.includes('text/event-stream'),
  });

  if (connected) {
    sseConnections.add(1);

    // Consume stream for 60 seconds
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const endTime = Date.now() + 60000;

    while (Date.now() < endTime) {
      const { done, value } = reader.read().catch(() => ({ done: true }));
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          sseEventsReceived.add(1);
        }
      }
    }
  } else {
    sseReconnects.add(1);
  }

  sleep(2);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'sse-load-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  return `SSE Flood Test Summary\n${JSON.stringify(data.metrics, null, 2)}`;
}