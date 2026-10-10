# Phase 9 SPEC: Hardware Radar & IoT Mesh (Track 3C) — Draft v2

## Ambiguity Score: 1/10 (Zero Ambiguity — Synthesized across Security, Mobile Hardware, and IoT Fleet Architecture Reviews)

---

## What This Phase Delivers (User-Visible)

### Campus Security & Operations Staff Experience
- **Live 2D/3D Proximity Radar (60 FPS)**: Interactive campus floorplan visualizing real-time BLE beacon positions, zone densities, geofence violations, and muster point counts with dual-layer canvas rendering and $<1.5\text{m}$ Kalman trilateration accuracy.
- **Smart Gate Kiosk & Access Control**: Sub-50ms NFC/RFID smart card and dynamic TOTP QR gate reader, turnstile relay triggers, visitor check-in kiosk with thermal badge printing and instant host notification.
- **5-Tier Anti-Passback (APB) Engine**: Configurable hard/soft APB with 3–5s double-tap jitter forgiveness, tailgating beam-break detection with Vision Shield snapshot capture, and automated emergency egress release.
- **Biometric Edge Mesh**: AES-256-GCM envelope encrypted biometric vectors (512-dim face embeddings and ANSI-378 fingerprint minutiae) with challenge-response nonces, offline edge caching, and GDPR cryptographic zeroization tombstones.
- **Hardware Fleet Health Monitor**: Real-time telemetry dashboard monitoring turnstiles, BLE scanners, and kiosk terminals via MQTT ($share group load balancing) and CoAP/DTLS, with automated battery degradation and missed heartbeat alerts.
- **Mobile Patrol Guard Companion (Flutter)**: Handheld patrol mode with adaptive duty-cycle BLE scanning ($<5.5\%$ battery/hr), dual-protocol NFC tag reading (ISO-DEP & NDEF), offline QR verification, and Merkle-chained disconnected outbox syncing.

### Parent & Student Experience
- **Student Smart Card & NFC Transit**: Single tap boarding on campus buses, library access, canteen meal dispensing, and gate entry with real-time push notification to parents.
- **Zone-Aware Safety Notifications**: Instant automated alerts when a student enters restricted areas or arrives at designated assembly areas during emergency drills.

### System Administrator Experience
- **Device Provisioning & OTA Pipeline**: One-click device enrollment with X.509 mTLS certificates or HMAC hardware keys, dual-bank flash watchdog validation, and canary firmware rollouts (1% $\rightarrow$ 10% $\rightarrow$ 100%).
- **Anti-Passback & Access Policy Rules**: Granular time-based, role-based, and zone-based access control rules with scheduled nightly APB state resets.

---

## What This Phase Does NOT Deliver (Explicit Exclusions)

| Excluded | Reason |
|----------|--------|
| Custom microcontroller firmware compilation | Handled via pre-compiled embedded C++/Rust binaries running on ESP32/Raspberry Pi edge gateways |
| Proprietary closed-protocol CCTV NVR integration | Handled via standard ONVIF/RTSP streams already supported in Vision Shield |
| Public cellular tower triangulation | BLE beacon proximity + Wi-Fi RTT + GNSS RTK provides campus-accurate localization |
| Commercial banking POS hardware integration | Canteen/fee cashless operations interface via standard ISO-7816/NFC protocol and internal wallet ledger |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PHYSICAL EDGE LAYER                               │
├───────────────────┬───────────────────┬─────────────────────────────────────┤
│  BLE/NFC Beacons  │  Gate Turnstiles  │  Biometric Readers & Kiosks         │
│  - iBeacon/Eddy   │  - Wiegand/Relays │  - 512-dim Face Vectors / Minutiae  │
│  - Student Badges │  - Dynamic QR TOTP│  - TPM 2.0 / ATECC608A Secure Elem │
└─────────┬─────────┴─────────┬─────────┴──────────────────┬──────────────────┘
          │                   │                            │
          ▼                   ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EDGE GATEWAY & MESH LAYER (IoT Broker)                 │
│  - MQTT (EMQX/Mosquitto) with mTLS X.509 & Shared Subscriptions            │
│  - CoAP / UDP (DTLS 1.2) for Ultra-Low Power Anchors                       │
│  - Redis Ring Buffer (Transient Beacon RSSI Cache, 3-5s TTL)               │
│  - Offline Biometric SQLite DB & Merkle Terminal Outbox                    │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            API & APPLICATION LAYER                          │
│  - POST /api/hardware/telemetry/ingest (Batch worker ingestion)             │
│  - POST /api/hardware/access-control/verify (Sub-50ms gate decision)       │
│  - GET  /api/hardware/radar/stream (SSE / WebSocket duplex stream)          │
│  - POST /api/hardware/biometric/sync (AES-256-GCM encrypted delta sync)     │
│  - POST /api/hardware/gates/lockdown (Step-Up signed override)              │
│  - POST /api/hardware/devices/provision (X.509 / HMAC key registration)     │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│ PostgreSQL / DB  │        │ Real-Time Mesh   │        │ AI & Copilot V2  │
│ - hardware_devices│        │ - SSE Zone Push  │        │ - Zone Anomaly   │
│ - hardware_zones │        │ - WS Radar Stream│        │ - Gate Triage    │
│ - hardware_events│        │ - FCM Alerts     │        │ - Patrol RAG     │
│ - hardware_bio...│        │ - Canvas 60 FPS  │        │ - Merkle Ledger  │
└──────────────────┘        └──────────────────┘        └──────────────────┘
```

---

## Database Schema Model (PostgreSQL & SQLite Parity)

```sql
-- 1. Hardware Devices & Gateways
CREATE TABLE hardware_devices (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    device_name VARCHAR(128) NOT NULL,
    device_type VARCHAR(32) NOT NULL, -- 'gate_controller' | 'ble_scanner' | 'kiosk' | 'biometric_terminal' | 'environmental'
    device_mac VARCHAR(32) NOT NULL,
    ip_address VARCHAR(45),
    zone_id VARCHAR(64) REFERENCES hardware_zones(id) ON DELETE SET NULL,
    certificate_thumbprint VARCHAR(64), -- SHA-256 X.509 client certificate thumbprint
    secret_hash VARCHAR(128),           -- Argon2id/HMAC secret hash for low-power MCUs
    direction VARCHAR(16) NOT NULL DEFAULT 'bidirectional', -- 'entry' | 'exit' | 'bidirectional'
    apb_mode VARCHAR(32) NOT NULL DEFAULT 'hard', -- 'hard' | 'soft' | 'disabled'
    apb_window_seconds INTEGER NOT NULL DEFAULT 120,
    firmware_version VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'offline', -- 'online' | 'offline' | 'degraded' | 'maintenance'
    battery_level INTEGER, -- 0-100 (null if mains powered)
    last_heartbeat_at TEXT,
    config_payload JSON,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX hw_dev_inst_mac_idx ON hardware_devices(institution_id, device_mac);
CREATE INDEX hw_dev_inst_zone_idx ON hardware_devices(institution_id, zone_id);

-- 2. Hardware Zones & Geofences
CREATE TABLE hardware_zones (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    zone_name VARCHAR(128) NOT NULL,
    zone_type VARCHAR(32) NOT NULL, -- 'classroom' | 'laboratory' | 'perimeter' | 'restricted' | 'assembly_point'
    building_name VARCHAR(128) NOT NULL,
    floor_number INTEGER NOT NULL DEFAULT 0,
    boundary_coordinates JSON NOT NULL, -- polygon GeoJSON or coordinate array
    path_loss_exponent REAL NOT NULL DEFAULT 3.0, -- n ∈ [2.0, 4.2] for RF trilateration
    reference_rssi_1m INTEGER NOT NULL DEFAULT -59, -- TxPower calibrated at 1 meter
    max_capacity INTEGER,
    current_occupancy INTEGER NOT NULL DEFAULT 0,
    is_lockdown_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX hw_zone_inst_building_idx ON hardware_zones(institution_id, building_name, floor_number);

-- 3. Hardware Access Badges & Beacons
CREATE TABLE hardware_badges (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    badge_number VARCHAR(64) NOT NULL,
    badge_type VARCHAR(32) NOT NULL, -- 'ble_beacon' | 'nfc_rfid' | 'dynamic_qr' | 'biometric'
    assigned_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    assigned_user_type VARCHAR(32), -- 'student' | 'staff' | 'visitor' | 'contractor'
    ble_major INTEGER,
    ble_minor INTEGER,
    ble_uuid VARCHAR(64),
    nfc_uid VARCHAR(64),
    apb_state VARCHAR(32) NOT NULL DEFAULT 'outside', -- 'outside' | 'inside_campus' | 'inside_zone'
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active' | 'suspended' | 'revoked' | 'lost'
    last_seen_zone_id VARCHAR(64) REFERENCES hardware_zones(id) ON DELETE SET NULL,
    last_seen_at TEXT,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX hw_badge_inst_num_idx ON hardware_badges(institution_id, badge_number);
CREATE UNIQUE INDEX hw_badge_inst_beacon_idx ON hardware_badges(institution_id, ble_uuid, ble_major, ble_minor);
CREATE INDEX hw_badge_inst_user_idx ON hardware_badges(institution_id, assigned_user_id);

-- 4. Hardware Biometric Templates (Encrypted AEAD Storage)
CREATE TABLE hardware_biometric_templates (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_type VARCHAR(32) NOT NULL, -- 'face_vector_512' | 'fingerprint_ansi378' | 'palm_vein'
    vector_version INTEGER NOT NULL DEFAULT 1,
    encrypted_payload TEXT NOT NULL,    -- AES-256-GCM ciphertext (Base64)
    iv VARCHAR(32) NOT NULL,            -- AES-256-GCM 96-bit IV (Base64)
    auth_tag VARCHAR(32) NOT NULL,      -- AES-256-GCM 128-bit authentication tag (Base64)
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active' | 'suspended' | 'revoked' | 'tombstoned'
    synced_device_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX hw_bio_inst_user_idx ON hardware_biometric_templates(institution_id, user_id);
CREATE UNIQUE INDEX hw_bio_user_type_idx ON hardware_biometric_templates(institution_id, user_id, template_type);

-- 5. Hardware Access Events & Audit Log (Merkle Chained)
CREATE TABLE hardware_access_events (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    device_id VARCHAR(64) NOT NULL REFERENCES hardware_devices(id) ON DELETE CASCADE,
    zone_id VARCHAR(64) REFERENCES hardware_zones(id) ON DELETE SET NULL,
    badge_id VARCHAR(64) REFERENCES hardware_badges(id) ON DELETE SET NULL,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(32) NOT NULL, -- 'entry_granted' | 'entry_denied' | 'exit_granted' | 'exit_denied' | 'anti_passback_violation' | 'tamper_alert'
    verification_method VARCHAR(32) NOT NULL, -- 'nfc' | 'ble' | 'qr' | 'face' | 'fingerprint' | 'manual_override'
    reason VARCHAR(128),
    prev_merkle_hash VARCHAR(64) NOT NULL,
    merkle_hash VARCHAR(64) NOT NULL,
    device_sequence_num INTEGER NOT NULL DEFAULT 1,
    is_offline_synced BOOLEAN NOT NULL DEFAULT FALSE,
    raw_signature VARCHAR(128),
    occurred_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX hw_evt_inst_device_idx ON hardware_access_events(institution_id, device_id);
CREATE INDEX hw_evt_inst_user_idx ON hardware_access_events(institution_id, user_id);
CREATE INDEX hw_evt_inst_time_idx ON hardware_access_events(institution_id, occurred_at);

-- 6. Hardware Telemetry Logs (Partitioned by created_at)
CREATE TABLE hardware_telemetry_logs (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    device_id VARCHAR(64) NOT NULL REFERENCES hardware_devices(id) ON DELETE CASCADE,
    cpu_usage REAL,
    memory_usage REAL,
    battery_level INTEGER,
    rssi INTEGER,
    packet_loss_ratio REAL,
    payload JSON,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX hw_telem_inst_dev_idx ON hardware_telemetry_logs(institution_id, device_id, created_at);
```

---

## 5-Tier RBAC & Permissions Matrix

| Permission Key | Super Admin | Admin | Principal | HOD | Staff | Guard / Security |
|----------------|:-----------:|:-----:|:---------:|:---:|:-----:|:----------------:|
| `hardware:devices:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `hardware:devices:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `hardware:radar:view` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `hardware:zones:manage` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `hardware:badges:manage` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `hardware:gates:override` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `hardware:lockdown:trigger` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `hardware:telemetry:ingest` | ✅ (Machine) | ✅ (Machine) | ❌ | ❌ | ❌ | ❌ |
| `hardware:sync:delta` | ✅ (Machine) | ✅ (Machine) | ❌ | ❌ | ❌ | ✅ (Guard) |

---

## Quality Gates & Verification Checklist

1. **Schema & Dialect Parity**: 100% column and index parity across SQLite (`schema.ts`) and PostgreSQL (`schema.pg.ts`).
2. **Deterministic Trilateration & Kalman Accuracy**: RSSI Kalman filter accuracy $\le 1.5\text{m}$ across variable path loss exponents $n \in [2.0, 4.2]$.
3. **Anti-Passback Strictness & Jitter**: Rejection of double-entry within APB window while permitting 3-5s jitter re-strikes.
4. **Biometric AEAD Security & Zeroization**: AES-256-GCM encryption/decryption, challenge-response nonces, and tombstone zeroization verification.
5. **Mobile Canvas Performance**: $\ge 58\text{ FPS}$ sustained on radar canvas during 100-blip stress testing with dual-layer `CustomPainter`.
6. **Patrol Battery Budget**: $\le 6\%$ battery drain per 1 hour of continuous foreground patrol scanning.
7. **Offline Sync Idempotency & Merkle Integrity**: 100% duplicate-free sync reconciliation across 1,000 disconnected outbox events with Merkle chain validation.
8. **Multi-Tenant Isolation & Zero Leaks**: 100% pass on `pnpm security:tenants`, `pnpm security:requireauth`, and `pnpm security:rbac`.
9. **Simulation Harness**: Executable `pnpm hardware:simulate` verifying 8 end-to-end hardware event cycles.
