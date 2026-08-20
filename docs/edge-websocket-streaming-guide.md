# Next.js Edge WebSocket Streaming Architecture Guide

## Overview
Edge WebSocket endpoints provide low-latency bidirectional communication for real-time AI token streaming and counselor collaboration.

## Edge Runtime Execution
- **Endpoint:** `/api/ws/copilot`
- **Runtime:** `edge`
- **Features:** Connection pooling, heartbeat ping-pong, token chunking, and Redis Pub/Sub broadcast mesh integration.
