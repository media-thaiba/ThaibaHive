import ws from 'k6/ws';
import { sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const wsConnections = new Rate('ws_connections');
const wsMessagesSent = new Rate('ws_messages_sent');
const wsMessageLatency = new Trend('ws_message_latency');
const wsReconnects = new Rate('ws_reconnects');

export const options = {
  scenarios: {
    websocket_concurrency: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up
        { duration: '5m', target: 200 },  // Sustained load
        { duration: '5m', target: 500 },  // Peak load
        { duration: '2m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'ws_connections': ['rate>0.95'],
    'ws_message_latency': ['p(95)<500'],
    'ws_reconnects': ['rate<0.05'],
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

export default function runWsConcurrency() {
  const headers = getAuthHeaders();
  const channelId = `test-channel-${__VU}-${__ITER}`;

  ws.connect(`${BASE_URL}/api/chat/ws`, { headers }, function (socket) {
    wsConnections.add(1);

    socket.on('open', function () {
      // Join channel
      socket.send(JSON.stringify({ type: 'join', channelId }));
    });

    socket.on('message', function (message) {
      const data = JSON.parse(message);
      if (data.type === 'message:new') {
        wsMessagesSent.add(1);
      }
    });

    socket.on('close', function () {
      wsReconnects.add(1);
    });

    socket.on('error', function (e) {
      console.error(`WS Error: ${e.error()}`);
    });

    // Send messages periodically
    const sendInterval = setInterval(() => {
      const start = Date.now();
      socket.send(JSON.stringify({
        type: 'message',
        channelId,
        content: `Load test message from VU ${__VU} iter ${__ITER}`,
        type: 'text',
      }));
      wsMessageLatency.add(Date.now() - start);
    }, 5000);

    socket.setTimeout(function () {
      clearInterval(sendInterval);
      socket.close();
    }, 60000);
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'ws-load-summary.json': JSON.stringify(data),
  };
}

function textSummary(data) {
  return `WebSocket Load Test Summary\n${JSON.stringify(data.metrics, null, 2)}`;
}