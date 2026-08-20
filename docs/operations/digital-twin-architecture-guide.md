# Autonomous Campus Digital Twin & Spatial Facility Intelligence Architecture Guide

## 1. System Overview & Core Objectives
The ThaibaHive Digital Twin (`TWIN-OPS` / `SpatialGrid`) subsystem creates a high-fidelity, real-time, 3D computational mirror of institutional physical infrastructure. It continuously fuses physical building topologies (BIM/CAD/GeoJSON), multi-protocol IoT sensor telemetry streams, real-time location services (RTLS), and predictive machine learning models to maximize campus energy efficiency, space utilization, and occupant safety.

## 2. Layered Architectural Blueprint

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION & VISUALIZATION                       │
│  - Admin Radar Studio (/admin/operations/digital-twin)                     │
│  - Stakeholder Discovery Canvas (/portal/facilities)                       │
│  - Flutter Mobile 3D Compass & Campus Maps (mobile/lib/features/twin)       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                       STREAMING & INGRESS INTERFACE                         │
│  - Next.js 16 Edge Server-Sent Events (/api/twin/stream)                    │
│  - WebSocket Telemetry Channel (SpatialStreamManager)                       │
│  - Prometheus OpenMetrics Telemetry Engine (8 series)                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    COGNITIVE ENGINES & SPATIAL SOLVERS                      │
│  - 3D Octree Spatial Partitioning Indexer ($O(\log N)$ point lookups)       │
│  - Ray-Casting Point-in-Polygon Containment (BoundingVolume)                │
│  - Holt-Winters 24h Occupancy Forecaster (Diurnal Weighting ML)             │
│  - Autonomous HVAC Setback Energy Optimizer (>= 15% kWh savings)            │
│  - 3D Dynamic A* Wayfinding Graph & Step-Free Accessibility Router          │
│  - Dynamic Emergency Evacuation Router (Sub-5s hazard avoidance)            │
│  - RTLS 3D Trilateration & Log-Distance Path Loss RSSI Localization         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                      IOT SENSOR MESH & PROTOCOL ADAPTERS                    │
│  - MQTT Topic Parser (`campus/{tenant}/{facility}/{space}/sensor/{id}`)    │
│  - CoAP Binary Frame Decoders                                               │
│  - HTTP Webhook Batch Ingestion & Deduplication Ingester                    │
│  - Statistical Z-Score Outlier Detector (Z >= 3.5 critical)                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                     DUAL-STORE PERSISTENCE & GOVERNANCE                     │
│  - 10 Relational Tables (SQLite & PostgreSQL 100% Column Parity)            │
│  - FERPA/GDPR Spatial Privacy Shield (Coordinate Masking & Anonymization)   │
│  - Tamper-Proof Cryptographic Merkle Audit Trail Logger (SHA-256)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3. Database Entity Relationship Model
The subsystem manages 10 core tables defined identically in `packages/db/schema.ts` and `packages/db/schema.pg.ts`:
1. `twin_facilities`: Campus buildings, geographical polygons, floor counts, total areas.
2. `twin_spaces`: Individual classrooms, labs, offices, corridors, capacity, and dimensions.
3. `twin_3d_models`: 3D CAD/BIM/GeoJSON mesh assets and Level of Detail (LOD0/LOD1/LOD2) tessellations.
4. `twin_sensors`: Physical IoT sensor registrations, protocol types, calibration offsets, and coordinates.
5. `twin_telemetry`: High-frequency metric timeseries frames with anomaly flags.
6. `twin_assets`: Tracked physical capital equipment, RFID/BLE beacon tags, and book values.
7. `twin_geofences`: 2D/3D polygon perimeter security boundaries with automated breach alarms.
8. `twin_maintenance_orders`: Automated preventive & corrective work orders dispatched by AI models.
9. `twin_wayfinding_nodes`: 3D wayfinding graph junctions, room entrances, stairwells, and emergency exits.
10. `twin_wayfinding_edges`: Directed weighted connectivity segments with step-free accessibility flags.

## 4. Operational API Reference Summary
- `GET /api/twin/facilities` — List facilities with multi-tenant filtering.
- `POST /api/twin/facilities` — Register facility structure (`twin:facilities:write`).
- `GET /api/twin/spaces` — Query spaces by facility and floor (`twin:facilities:read`).
- `POST /api/twin/spaces` — Create space (`twin:facilities:write`).
- `PATCH /api/twin/spaces` — Update live space occupancy and comfort scores.
- `POST /api/twin/telemetry/ingest` — Ingest single or batch telemetry frames (`twin:iot:ingest`).
- `GET /api/twin/telemetry/live` — Fetch live anonymized telemetry for dashboards.
- `POST /api/twin/optimization/predict` — Generate 24h Holt-Winters occupancy forecast & HVAC savings.
- `POST /api/twin/wayfinding` — Solve 3D navigation route with step-free options.
- `POST /api/twin/emergency/simulate` — Execute dynamic hazard avoidance and crowd egress simulation.
- `GET /api/twin/stream` — Real-time Server-Sent Events push telemetry stream.
- `GET /api/metrics` — Scrape Prometheus OpenMetrics telemetry series.
