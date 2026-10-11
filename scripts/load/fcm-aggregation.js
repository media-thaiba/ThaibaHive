import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const fcmNotificationsSent = new Counter('fcm_notifications_sent');
const fcmBatchLatency = new Trend('fcm_batch_latency_ms');
const fcmDeliveryErrors = new Rate('fcm_delivery_errors');

export const options = {
  scenarios: {
    fcm_aggregation_stress: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1m',
      preAllocatedVUs: 20,
      maxVUs: 100,
      stages: [
        { target: 500, duration: '2m' },
        { target: 2000, duration: '5m' },
        { target: 5000, duration: '5m' },
        { target: 10000, duration: '3m' },
        { target: 0, duration: '2m' },
      ],
    },
  },
  thresholds: {
    'fcm_batch_latency_ms': ['p(95)<5000', 'p(99)<10000'],
    'fcm_delivery_errors': ['rate<0.02'],
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

const CHANNEL_IDS = Array.from({ length: 50 }, (_, i) => `load-test-channel-${i}`);

export default function runFcmAggregation() {
  const headers = getAuthHeaders();
  const channelId = CHANNEL_IDS[Math.floor(Math.random() * CHANNEL_IDS.length)];

  // Trigger a message send which will queue FCM notification
  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/api/chat/channels/${channelId}/messages`,
    JSON.stringify({
      content: `FCM load test message ${Date.now()}`,
      type: 'text',
    }),
    { headers, timeout: '15s' }
  );
  const latency = Date.now() - start;

  fcmBatchLatency.add(latency);
  fcmNotificationsSent.add(1);

  const success = check(res, {
    'Message sent status 201': (r) => r.status === 201,
    'Response has message ID': (r) => {
      try {
        return !!JSON.parse(r.body).message?.id;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    fcmDeliveryErrors.add(1);
  }

  // Random sleep to simulate realistic user behavior
  sleep(Math.random() * 2);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'fcm-load-summary.json': JSON.stringify(data),
  };
}

function textSummary(data) {
  return `FCM Aggregation Stress Test Summary\n${JSON.stringify(data.metrics, null, 2)}`;
}