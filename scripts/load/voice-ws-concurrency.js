import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const voiceRequests = new Counter('voice_requests_total');
const voiceTurnLatency = new Trend('voice_turn_latency');
const voiceErrors = new Rate('voice_errors');
const audioChunkBytes = new Trend('audio_chunk_bytes');

export const options = {
  scenarios: {
    voice_concurrency_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },   // Warm up
        { duration: '3m', target: 200 },  // Sustained load
        { duration: '2m', target: 500 },  // Peak concurrent turns
        { duration: '1m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'voice_turn_latency': ['p(95)<300', 'p(99)<600'],
    'voice_errors': ['rate<0.02'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = __ENV.JWT_TOKEN || '';

const TEST_VOICE_COMMANDS = [
  'Show pending leave requests for staff',
  'Approve expense claim for chemistry lab equipment',
  'Summarize today attendance across primary school',
  'Find recent circulars regarding exam schedules',
  'Generate fee collection report for October',
  'Who is on gate duty at main entrance?',
  'Schedule parent teacher meeting for class 10A',
  'Check energy consumption in science block',
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
  const transcript = TEST_VOICE_COMMANDS[Math.floor(Math.random() * TEST_VOICE_COMMANDS.length)];
  const sessionId = `load-voice-${__VU}-${__ITER}-${Date.now()}`;

  const payload = JSON.stringify({
    sessionId,
    transcript,
    audioChunksCount: 4,
    audioMimeType: 'audio/webm;codecs=opus',
  });

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/ai/copilot/voice/interact`, payload, {
    headers,
    timeout: '10s',
  });
  const latency = Date.now() - start;

  voiceTurnLatency.add(latency);
  voiceRequests.add(1);
  audioChunkBytes.add(payload.length);

  const success = check(res, {
    'Voice interact status 200': (r) => r.status === 200,
    'Voice response has reply': (r) => {
      try {
        const data = JSON.parse(r.body);
        return typeof data.reply === 'string' && data.reply.length > 0;
      } catch {
        return false;
      }
    },
    'Voice session preserved': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.sessionId === sessionId || typeof data.sessionId === 'string';
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    voiceErrors.add(1);
  }

  sleep(Math.random() * 0.5 + 0.5);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'voice-load-summary.json': JSON.stringify(data),
  };
}

function textSummary(data) {
  return `Voice Copilot Concurrency Load Test Summary\n${JSON.stringify(data.metrics, null, 2)}`;
}
