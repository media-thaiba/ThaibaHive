# Phase 9: Hardware Radar & IoT Mesh (Track 3C) — Draft v2

**Milestone**: ThaibaHive v3.38.0 — Cyber-Physical Campus Intelligence  
**Branch**: `feat/phase-9-hardware-radar-iot`  
**Base**: `v3.37.0` (AI Copilot V2 + Real-Time Mesh + Production Soak)  
**Status**: Draft v2 — Cross-AI Reviewed (Security & Cryptographic Gate Architecture, Mobile & Edge Hardware, and IoT Fleet Architecture Incorporated)

---

## 1. Executive Summary

Phase 9 establishes the **Cyber-Physical Operating System** for ThaibaHive by bridging physical campus infrastructure (turnstiles, BLE anchors, kiosks, and biometric terminals) with digital identity and real-time operations.

### Key Architectural Pillars:
1. **Proximity Radar & Spatial Tracking**: Continuous BLE/NFC beacon RSSI trilateration (Rolling Median + 2D Kalman + Weighted Least Squares with zone $n \in [2.0, 4.2]$), dynamic polygon geofencing, and emergency muster accounting.
2. **Access Control & Anti-Passback Gateways**: Sub-50ms NFC/RFID/dynamic QR TOTP verification, turnstile dry-contact relay dispatch, 5-tier anti-passback state machine with jitter suppression, and life-safety fail-safe egress compliance.
3. **Edge Biometric Synchronization Mesh**: AES-256-GCM envelope encrypted 512-dim face vectors and fingerprint minutiae, challenge-response nonces, offline edge SQLite caching, and GDPR cryptographic zeroization tombstones.
4. **Hardware Fleet Telemetry & OTA**: Device health heartbeats, battery degradation alerts, MQTT shared broker ingestion with Redis write-behind caching, and dual-bank watchdog OTA canary rollout (1% $\rightarrow$ 10% $\rightarrow$ 100%).
5. **Real-Time Visual Radar & Mobile Patrol**: Dual-layer 60 FPS Canvas radar rendering with `Float32List` blip buffers, Flutter guard patrol companion with adaptive BLE duty cycling ($<5.5\%$ battery/hr), dual-protocol NFC, and Merkle-chained offline outbox syncing.

---

## 2. Execution Waves & Commits

### Wave 1: Database Schema, Parity Migrations & 5-Tier RBAC (Commit 1)
- Add tables `hardware_devices`, `hardware_zones`, `hardware_badges`, `hardware_biometric_templates`, `hardware_access_events`, `hardware_telemetry_logs` to `packages/db/schema.ts` (SQLite) and `packages/db/schema.pg.ts` (PostgreSQL).
- Enforce composite unique indexes: `(institution_id, device_mac)`, `(institution_id, badge_number)`, `(institution_id, ble_uuid, ble_major, ble_minor)`, and `(institution_id, user_id, template_type)`.
- Generate Drizzle migrations: SQLite (`drizzle/0035_hardware_radar.sql`) and PostgreSQL (`drizzle/0019_hardware_radar.sql`).
- Map 9 new permissions (`hardware:devices:manage`, `hardware:devices:view`, `hardware:radar:view`, `hardware:zones:manage`, `hardware:badges:manage`, `hardware:gates:override`, `hardware:lockdown:trigger`, `hardware:telemetry:ingest`, `hardware:sync:delta`) in `packages/auth/roles.ts`.
- Add test suites: `packages/auth/__tests__/hardware-rbac-matrix.test.ts` and `packages/db/__tests__/schema-drift.test.ts` parity check.

### Wave 2: Telemetry Ingestion & Device Fleet Management (Commit 2)
- Build `HardwareDeviceEngine`: X.509 client certificate thumbprint validation and timing-safe HMAC token verification for low-power MCUs.
- Implement MQTT/HTTP batch telemetry ingestion worker with in-memory ring buffer and Redis write-behind caching for high-frequency beacon advertisements.
- Ingestion endpoints: `POST /api/hardware/devices/register`, `POST /api/hardware/telemetry/heartbeat`, `POST /api/hardware/telemetry/ingest`, `GET /api/hardware/devices`.
- Anomaly detector flagging offline devices (LWT or $>3$ missed heartbeats) and low battery ($\le 15\%$).
- Build `FirmwareOTAEngine`: Dual-bank flash watchdog validation state machine, Ed25519 manifest signature verification, and canary deployment stages (1% $\rightarrow$ 10% $\rightarrow$ 100%).

### Wave 3: Proximity Radar & Spatial Geofence Engine (Commit 3)
- Build `TrilaterationEngine`:
  - 5-sample Rolling Median filter to reject multipath spikes.
  - 1D Kalman RSSI smoother per anchor.
  - Log-distance path loss model with dynamic per-zone exponent $n \in [2.0, 4.2]$ and calibrated $\text{TxPower}_{1\text{m}}$.
  - Weighted Least Squares (WLS) solver with GDOP collinearity fallback.
- Build `GeofenceEngine`: Ray-casting point-in-polygon detector mapping coordinates to `hardware_zones`.
- Live real-time stream endpoint: `GET /api/hardware/radar/stream` (SSE/WS duplex) broadcasting zone densities and interpolated beacon positions.
- Emergency muster counter computing evacuated vs missing occupants per assembly zone during alarms.

### Wave 4: Smart Gate & Anti-Passback Access Engine (Commit 4)
- Build `GateAccessEngine`:
  - Multi-factor authentication (NFC UID, dynamic TOTP QR with Ed25519 signature, Biometric face vector).
  - 5-tier Anti-Passback (APB) state machine (`OUTSIDE`, `INSIDE_CAMPUS`, `INSIDE_ZONE`) with hard/soft modes.
  - 3–5s double-tap jitter forgiveness (re-strike without APB violation penalty).
  - Tailgating detection alert dispatch to Vision Shield.
  - Emergency mass egress automatic bypass on active alarm.
  - Nightly scheduled APB state reset cron job.
- Gate access verification endpoint: `POST /api/hardware/access-control/verify` (sub-50ms execution).
- Step-Up authorized emergency lockdown endpoint: `POST /api/hardware/gates/lockdown` with cryptographic super-admin bypass tokens.
- Cryptographic Merkle event chaining with sequential `prev_merkle_hash` in `hardware_access_events`.

### Wave 5: Edge Biometric Synchronization Mesh & Cryptographic Zeroization (Commit 5)
- Build `BiometricMeshEngine`:
  - AES-256-GCM envelope encryption and decryption for 512-dim facial vectors and ANSI-378 minutiae templates.
  - Challenge-response nonce generator with 30s sliding-window replay defense.
  - Cosine similarity matching ($\ge 0.82$ match threshold).
  - Cryptographic tombstone zeroization broadcast (`status = 'tombstoned'`) and deletion receipt auditing for GDPR compliance.
- Differential edge delta sync endpoint: `POST /api/hardware/biometric/sync` allowing edge terminals to pull incremental template updates.
- Offline Merkle event batch reconciliation endpoint: `POST /api/hardware/telemetry/sync-events` re-anchoring offline access logs upon WAN reconnection.

### Wave 6: Web Command Center & Visual Radar Map (Commit 6)
- Build `CampusRadarMap` (`src/components/hardware/campus-radar-map.tsx`) with dual-layer 60 FPS rendering, animated beacon blips, zone heatmaps, and turnstile status indicators.
- Build `GateMonitoringConsole` (`src/components/hardware/gate-monitoring-console.tsx`) displaying live access event stream, visitor queue, tailgating alerts, and lockdown triggers.
- Build `DeviceFleetTable` (`src/components/hardware/device-fleet-table.tsx`) with battery meters, signal bars, LWT status, and OTA firmware rollout controls.
- Wire into Authenticated Shell (`src/app/(shell)/operations/radar/page.tsx` and `src/app/(shell)/operations/hardware/page.tsx`).

### Wave 7: Mobile Guard Patrol & NFC Scanner (Flutter) (Commit 7)
- Build `PatrolRadarService`: Background BLE scanner with adaptive duty cycling (3.5s ON / 2.5s OFF when moving, 2.0s ON / 8.0s OFF when stationary, targeting $<5.5\%$ battery/hr).
- Build `NfcScannerService`: Dual-protocol NFC reader handling ISO-DEP (DESFire smart badges) and NDEF (patrol route checkpoints).
- Build `DynamicQrScanner`: Camera barcode scanner with restricted ROI bounding box and offline Ed25519 signature validator.
- Build `RadarCanvas`: Dual-layer `CustomPainter` with contiguous `Float32List` blip buffers rendering at steady 60 FPS without GC frame drops.
- Build `TerminalOutboxWorker`: Local SQLite queueing with offline Merkle hash chaining and automatic batch synchronization upon reconnection.

---

## 3. Quality Gates Checklist

| Quality Gate | Requirement | Verification Method |
|--------------|-------------|---------------------|
| **1. TypeScript** | 0 compilation errors | `npm run typecheck` |
| **2. ESLint** | 0 lint errors | `npm run lint` |
| **3. Schema Parity** | 100% SQLite & PostgreSQL parity | `packages/db/__tests__/schema-drift.test.ts` |
| **4. Multi-Tenant Isolation** | 0 cross-tenant leaks | `pnpm security:tenants` |
| **5. RequireAuth Guarding** | 0 naked route handlers | `pnpm security:requireauth` |
| **6. RBAC Completeness** | 100% permissions mapped in 5-tier matrix | `pnpm security:rbac` |
| **7. Math & Trilateration** | Kalman accuracy $\le 1.5\text{m}$ across $n \in [2.0, 4.2]$ | `src/lib/hardware/__tests__/trilateration.test.ts` |
| **8. Anti-Passback Gate** | Hard APB blocked, jitter re-strike allowed | `src/lib/hardware/__tests__/anti-passback.test.ts` |
| **9. Biometric AEAD** | AES-256-GCM encryption + tombstone zeroization | `src/lib/hardware/__tests__/biometric-mesh.test.ts` |
| **10. Merkle Ledger** | Offline batch replay integrity validation | `src/lib/hardware/__tests__/merkle-hardware-ledger.test.ts` |
| **11. Mobile Frame Rate** | $\ge 58\text{ FPS}$ sustained radar canvas rendering | Flutter widget benchmark |
| **12. Patrol Battery Budget**| $\le 6\%$ battery drain / hour foreground scan | Android batterystats profile |
| **13. Simulation Harness** | 8/8 end-to-end hardware simulation cycles pass | `pnpm hardware:simulate` |
