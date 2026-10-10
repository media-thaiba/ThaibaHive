import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, getAuthHeaders } from './lib/auth-session.js';

export const voiceLatency = new Trend('voice_turn_latency_ms', true);
export const voiceErrors = new Rate('voice_error_rate');
export const voiceTurnsTotal = new Counter('voice_turns_total');

export const options = {
  scenarios: {
    voice_soak: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '1m', target: 25 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 5 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<300', 'p(99)<500'],
    'voice_error_rate': ['rate<0.005'],
    'http_req_failed': ['rate<0.005'],
  },
};

export default function voiceCopilotSoak() {
  const vuId = __VU;
  const sessionId = `ses_soak_${vuId}`;

  const payload = JSON.stringify({
    sessionId: sessionId,
    audioTranscript: "Show today's attendance summary and pending visitor passes",
    voiceProfile: "nova",
    language: "en-US",
  });

  const params = {
    headers: getAuthHeaders('staff'),
    tags: { name: 'POST /api/ai/copilot/voice/interact' },
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/ai/copilot/voice/interact`, payload, params);
  const duration = Date.now() - start;

  voiceLatency.add(duration);
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has valid response': (r) => r.body && (r.body.includes('session') || r.body.includes('audio') || r.body.includes('transcript')),
  });

  if (success) {
    voiceTurnsTotal.add(1);
    voiceErrors.add(0);
  } else {
    voiceErrors.add(1);
  }

  sleep(0.5);
}
