# Implementation Contract: Sprint-022 Visual Playback Controller & Telemetry Optimization

**Sprint ID:** VISUAL-PLAYBACK-CONTROLLER-022 (VPC-022)  
**Sprint Name:** Visual Playback Controller & Telemetry Optimization  
**Status:** Approved Engineering Contract  
**Created Date:** 2026-08-04  
**Target Execution:** 2026-08-05 to 2026-08-12  
**Estimated Duration:** 5–7 days (40–60 engineering hours)  
**Risk Level:** Medium (Client-side rendering latency under high event playback load, gzip/brotli stream CPU overhead, index parity parity sync validation)  
**Classification:** AIOS v3.6 Official Implementation Contract  
**Target Release Version:** v3.6.0 (Visual Playback Console, Telemetry Compression Middleware, ESLint & Parity Debt Cleanup)

---

## Executive Summary

Sprint-022 executes the **Visual Playback Controller & Telemetry Optimization** sprint, advancing the ThaibaHive platform from v3.5.0 into **v3.6.0**. This sprint focuses on three core pillars:

1. **Completing the Observability Story:** Surfacing the CLI-based historical replay capabilities directly into the Next.js Swarm Observability Console. Administrators will be able to pause, play, step, and scrub historical timelines graphically.
2. **Telemetry Ingestion & Compression:** Optimizing edge-to-server data transmission and server-to-client SSE streaming using gzip/brotli compression middleware, cutting multi-region bandwidth costs by 40-50% and charting savings.
3. **Technical Debt Resolution:** Remediating the 29 accumulated problems (12 errors, 17 warnings) reported by ESLint (including React 19 hook purity errors) and automating SQLite ↔ PostgreSQL database schema index parity checks to prevent broken migrations.

---

## Technical Feasibility & Soundness Evaluation

### Soundness Evaluation

- **Visual Playback Architecture:** Extends the existing `PlaybackEngine` that queries historical `swarm_events` and `swarm_metrics`. A global Zustand/React context store captures timeline playback ticks, stepping through events chronologically and mapping them frame-by-frame to dashboard states. By disconnecting the live SSE stream during playback, we prevent state collision.
- **Compression & Ingestion Pipeline:** Leverages native Node.js `zlib` capabilities. Edge nodes (both simulated and distributed) push event logs to a new telemetry endpoint (`/api/admin/swarm/telemetry`) using `Content-Encoding: gzip/br`. The decompression middleware handles payload extraction automatically. Outbound SSE broadcasts are similarly compressed using gzip compression to reduce data footprint.
- **Index Parity Automation:** A sync checks script (`sync-sqlite-indexes.ts`) parses the SQLite schema against the PostgreSQL schema and validates generated migrations to drop redundant SQLite-specific index creations that fail local sqlite `db:push` executions.

### Technical Risks Identified & Mitigations

1. **Browser Render Lag on Timeline Scrubbing**
   - *Challenge:* Scrubbing through a large time range with >10,000 events can trigger massive React re-render cycles, blocking the main thread.
   - *Mitigation:* Implement virtualized lists for playback log overlays and throttled state updates (maximum 30fps timeline ticks) to maintain fluid rendering.
2. **CPU Overhead from Compression**
   - *Challenge:* Compressing thousands of metrics per second on edge node processes or Next.js middleware could increase CPU load.
   - *Mitigation:* Buffer telemetry batches in-process and use gzip compression levels configured for maximum speed (level 1-3) rather than maximum compression, caching computed compression stats.
3. **SSE Connection Termination on Compression Failures**
   - *Challenge:* An error during on-the-fly streaming gzip compression could crash the persistent SSE stream response, dropping active administrative sessions.
   - *Mitigation:* Wrap gzip stream encoders in try/catch pipelines, automatically falling back to standard text stream output on compression engine failure.

---

## Scope & Out of Scope

### In Scope

1. **Visual Playback Control Dashboard:**
   - Playback state store managing time boundaries, speeds, index sliders, play/pause toggles, and range selectors.
   - React controller bar component with modular subcomponents (PlayPauseButton, TimelineSlider, SpeedSelector).
   - Virtualized event log console overlay showing chronological events.
   - Integration with dashboard widgets (`SwarmTopology`, `TelemetryDashboard`, etc.) showing state at a selected point in time.

2. **Telemetry Ingestion & Compression Pipeline:**
   - Native Node.js zlib compression utility wrapper supporting gzip and brotli.
   - Telemetry ingestion API endpoint (`/api/admin/swarm/telemetry`) supporting decompression middleware with protection against large payloads (zip bombs).
   - Inbound and outbound gzip compression capabilities for SSE stream channels.
   - Data transfer tracking mechanism measuring raw vs. compressed bytes, saving rates, and exposing these via REST APIs.

3. **Technical Debt & Parity Cleanup:**
   - Synchronization script `sync-sqlite-indexes.ts` automating index comparison checks between PostgreSQL and SQLite.
   - Systematic resolution of 12 React 19 purity warnings (impure `Date.now()` render calls) and 17 legacy eslint warnings.
   - Complete lint verification checking for zero errors/warnings.

### Explicitly Out of Scope

- Designing new database schemas for swarm tables. The implementation builds upon tables established in Sprint-021.
- Creating native mobile UI playback components for the Flutter app. Responsiveness is handled strictly via web page layouts.
- Auto-healing integration execution within the playback mode. Replay mode is read-only.
- Replacing the primary Drizzle migration dialect structure.

---

## Plan Reviews & Model Feedback Integration

Per the **Plan Review Rule** documented in `AGENTS.md`, this implementation contract was submitted for multi-model technical review to **OpenCode (Local-Ollama)**. The following architectural and verification enhancements were incorporated into the task specifications:

### OpenCode (Local-Ollama) Feedback:
1. **Encapsulation & Context Hook Wrapper (VPC-001):** Required implementing a `usePlaybackState` hook to wrap the global Zustand/React Context store, encapsulating action dispatching and improving component readability.
2. **Subcomponent Modularization & Empty States (VPC-002):** Required decomposing the player bar UI into modular child components (`PlayPauseButton`, `TimelineSlider`, `SpeedSelector`) to keep code maintainable, and visually distinguishing disabled controls when range datasets are empty.
3. **State Provider Synchronization & Transitions (VPC-003):** Mandated a high-level state provider to synchronize all active dashboard widgets, ensuring that transitioning from play to pause or live to playback modes occurs seamlessly without state drift.
4. **Keyboard Accessibility & Performance Profiling (VPC-004):** Added keyboard arrow navigation requirements inside the virtualized timeline lists and integrated performance profiling tests to ensure FPS remains at 60 and memory footprint is capped below 50MB.
5. **Adjustable Compression Levels & Edge-case Handling (VPC-005):** Required that zlib utility methods accept configurable compression speed levels and gracefully handle edge cases like null, undefined, empty buffers, and massive strings.
6. **Decompression Bomb Protection (VPC-006):** Enforced a payload size limit check (maximum 5MB decompressed size) in the decompression middleware to protect the web server from zip bomb attacks.
7. **SSE Socket Cleanup Safety (VPC-007):** Added explicit connection pooling safety checks to prevent memory leaks from zlib compression streams when clients unexpectedly close SSE connections.
8. **Low-Bandwidth Degraded Performance mode (VPC-008):** Required that the playback UI fallback to a degraded performance mode (e.g. lowering telemetry graph updates and rendering simpler timeline frames) if the connection bandwidth drops below 100kbps.
9. **Index Parity Script Pre-Commit integration (VPC-009):** Required integrating index sync checks into the build validation scripts to assert naming pattern consistency, data types matching, and auto-checking on workspace commits.
10. **ESLint Verification pre-commit hooks (VPC-010):** Enforced that the resolved warnings must pass a strict `pnpm lint` check as a gate in local pre-commit hooks.

---

## Detailed Task Breakdown

### Phase 1: Visual Playback Controller UI & Shared State

#### Task VPC-001: Playback State Store & usePlaybackState Hook
- **Task ID:** VPC-001
- **Description:** Implement a global state manager/store to track playback ranges, ticking intervals, current timelines, and events slicing, wrapped in a `usePlaybackState` hook.
- **Files:**
  - `src/lib/observability/playback-state.ts` [NEW]
- **Dependencies:** None
- **Acceptance Criteria:**
  - Creates a state store containing properties: `isPlaybackMode` (boolean), `isPlaying` (boolean), `playbackSpeed` (0.5x | 1x | 2x | 5x), `currentTime` (string), `startTime` (string), `endTime` (string), `events` (PlaybackEvent[]), `currentIndex` (number).
  - Implements actions: `togglePlaybackMode()`, `play()`, `pause()`, `stepForward()`, `stepBackward()`, `scrubTimeline(index: number)`, `setPlaybackRange(start: string, end: string)`.
  - Timer-based playback tick updates `currentIndex` and `currentTime` relative to the selected `playbackSpeed`.
  - Slice logic efficiently maps timeline arrays without memory exhaustion.
  - Exposes `usePlaybackState` hook context encapsulating Zustand store access.
  - Store initializes gracefully with default empty states when query ranges contain zero records.
- **Verification Method:** Run unit tests validating action transitions, tick increments, and range inputs.
- **Estimated Complexity:** Medium

#### Task VPC-002: Modular Next.js Playback Control Bar Component
- **Task ID:** VPC-002
- **Description:** Implement the media-player style visual controller interface with timeline sliders, speed triggers, and date-time boundaries, decomposed into subcomponents.
- **Files:**
  - `src/components/swarm/PlaybackController.tsx` [NEW]
- **Dependencies:** VPC-001
- **Acceptance Criteria:**
  - Component renders timeline scrub bar using standard slider.
  - Decomposes control bar into modular subcomponents: `PlayPauseButton`, `TimelineSlider`, `SpeedSelector`.
  - Media control buttons: Play/Pause, Step-Backward (`|<`), Step-Forward (`>|`), and Fast-Forward (`>>`).
  - Dropdown select for speed configurations (0.5x, 1x, 2x, 5x).
  - Date/time picker inputs to set start and end boundaries for historical playback range.
  - Visually disables and styles controls with distinct low-opacity classes when empty datasets are loaded.
  - Follows existing Radix UI + CSS variable designs with high visual fidelity.
- **Verification Method:** Mount component and verify click handlers trigger correct state modifications in the store.
- **Estimated Complexity:** Medium

#### Task VPC-003: Dashboard Integration & Playback Mode Handling
- **Task ID:** VPC-003
- **Description:** Integrate the Playback Controller into the main Swarm Intelligence Console, routing active page states to the loaded playback frame when active.
- **Files:**
  - `src/app/(shell)/admin/swarm-intelligence/page.tsx` [MODIFY]
- **Dependencies:** VPC-002
- **Acceptance Criteria:**
  - Toggling `isPlaybackMode = true` immediately closes/disconnects the active SSE stream `EventSource` connection.
  - Page fetches historical events within the selected timeframe range using `PlaybackEngine`.
  - Maps selected playback event data at `currentIndex` to individual widget inputs (`nodes`, `sessions`, `metrics`, `remediations`), displaying the system state as it was at that tick.
  - High-level provider synchronizes states across components to ensure no layout jitter or state mismatches.
  - Toggling `isPlaybackMode = false` re-establishes the SSE stream connection and clears historical playback memory.
- **Verification Method:** Mock historical events and ensure widgets correctly display historical event properties during playback navigation.
- **Estimated Complexity:** Medium-High

#### Task VPC-004: Timeline Virtualization and Pagination for Large Datasets
- **Task ID:** VPC-004
- **Description:** Create a virtualized sidebar log display of historical events inside the playback panel to handle large event lists efficiently, supporting keyboard navigation.
- **Files:**
  - `src/components/swarm/PlaybackEventList.tsx` [NEW]
- **Dependencies:** VPC-002, VPC-003
- **Acceptance Criteria:**
  - Renders a scrollable list showing timestamps, severity badges, and source labels.
  - Implements vertical list virtualization (e.g. rendering only visible items) for large lists.
  - Supports keyboard arrow key navigation (Up/Down) to step through events on target focus.
  - Scrolling stays highly responsive (maintaining 60 FPS) with up to 10,000 events and memory footprint remains capped below 50MB.
- **Verification Method:** Load 10,000 mock events; assert memory usage remains stable and scrolls at 60 FPS.
- **Estimated Complexity:** Medium

---

### Phase 2: Telemetry Compression & Decompression Pipeline

#### Task VPC-005: Compression Utilities (Gzip/Brotli Core)
- **Task ID:** VPC-005
- **Description:** Write core helper utilities implementing compression and decompression functions using Node's native `zlib` library, supporting configurable compression levels.
- **Files:**
  - `src/lib/observability/compression.ts` [NEW]
- **Dependencies:** None
- **Acceptance Criteria:**
  - `compressPayload(data: object, level?: number): Promise<Buffer>` compresses input JSON data using gzip at adjustable speeds (default level 3).
  - `decompressPayload(buffer: Buffer): Promise<object>` decompresses compressed buffers back into objects.
  - Gracefully handles edge cases like null, undefined, empty buffers, and massive strings without crashing.
  - Automatically falls back to raw data parsing if gzip signatures are missing or decompression fails.
- **Verification Method:** Unit test payload objects of varying sizes and verify compression/decompression output.
- **Estimated Complexity:** Medium

#### Task VPC-006: Telemetry Ingestion Endpoint with Decompression Middleware
- **Task ID:** VPC-006
- **Description:** Create the API ingestion route allowing edge nodes to push compressed batch telemetry updates, adding protection against zip bomb attacks.
- **Files:**
  - `src/app/api/admin/swarm/telemetry/route.ts` [NEW]
- **Dependencies:** VPC-005
- **Acceptance Criteria:**
  - Endpoint accepts `POST` requests under `requireAuth` checking for `observability:write`.
  - Automatically detects `Content-Encoding: gzip` or `br` headers.
  - Limits decompressed size allocations (max 5MB body) to protect against memory-exhaustion (zip bomb) attacks.
  - Decompresses body, validates event structure, and registers events to `EventBus` in bulk.
  - Rejects unauthenticated or malformed payloads with descriptive error codes.
- **Verification Method:** Post compressed gzip payload; verify HTTP 200 and database updates. Verify 5MB+ decompressed inputs are rejected.
- **Estimated Complexity:** Medium-High

#### Task VPC-007: Outbound SSE Compression Middleware
- **Task ID:** VPC-007
- **Description:** Implement outbound compression on the SSE stream channel to reduce network transfer bytes, ensuring clean resource release on disconnect.
- **Files:**
  - `src/lib/observability/sse-manager.ts` [MODIFY]
  - `src/app/api/admin/swarm/stream/route.ts` [MODIFY]
- **Dependencies:** VPC-005
- **Acceptance Criteria:**
  - Configures outbound response streaming to compress SSE events using gzip if connection headers support it.
  - Enforces socket cleanup handler that releases zlib stream encoders on client disconnect, preventing memory leaks.
  - Integrates error boundaries that fall back to standard text stream output on compression engine failure.
- **Verification Method:** Connect to SSE route with compression enabled; check data format and compression.
- **Estimated Complexity:** Medium-High

#### Task VPC-008: Bandwidth Savings Tracking & Dashboard Integration
- **Task ID:** VPC-008
- **Description:** Collect data transfer sizes to record compression ratios, exposing saving metrics and supporting a low-bandwidth degraded state.
- **Files:**
  - `src/lib/observability/compression-tracker.ts` [NEW]
  - `src/components/swarm/TelemetryDashboard.tsx` [MODIFY]
  - `src/app/api/admin/swarm/metrics/route.ts` [MODIFY]
- **Dependencies:** VPC-005, VPC-007
- **Acceptance Criteria:**
  - Tracks and stores metrics: `raw_bytes_transferred`, `compressed_bytes_transferred`, `bandwidth_saved_pct`.
  - API returns average savings data points.
  - TelemetryDashboard displays bandwidth savings percentages and compression performance graphs.
  - Automatically drops dashboard update frequency if network speed falls below 100kbps (degraded state).
- **Verification Method:** Perform payload operations; check db tables and dashboard charts.
- **Estimated Complexity:** Medium

---

### Phase 3: Technical Debt & Schema Parity

#### Task VPC-009: SQLite ↔ PostgreSQL Schema Index Parity Automation Script
- **Task ID:** VPC-009
- **Description:** Build a synchronization script that checks schema definitions for SQLite and PostgreSQL, verifying index name parity during pushes.
- **Files:**
  - `scripts/sync-sqlite-indexes.ts` [NEW]
- **Dependencies:** None
- **Acceptance Criteria:**
  - Script checks index naming patterns, columns, and data type alignment in `packages/db/schema.ts` and `packages/db/schema.pg.ts`.
  - Automatically identifies duplicate SQLite index scripts or differences that fail push configurations.
  - Returns exit code 1 if index schemas mismatch.
  - Integrates into compile/build process as a static validation step.
- **Verification Method:** Execute script manually and verify correctness of output logs on index discrepancies.
- **Estimated Complexity:** Medium

#### Task VPC-010: React 19 / ESLint Warnings Resolution
- **Task ID:** VPC-010
- **Description:** Resolve 29 ESLint warnings and React 19 purity warnings across components.
- **Files:**
  - `src/components/swarm/ComplianceMonitor.tsx` [MODIFY]
  - `src/components/swarm/NegotiationTracker.tsx` [MODIFY]
  - `src/components/swarm/RemediationHistory.tsx` [MODIFY]
  - `src/components/swarm/TelemetryDashboard.tsx` [MODIFY]
  - `src/lib/__tests__/ml-autotune.test.ts` [MODIFY]
  - `src/lib/federation/schema-manager.ts` [MODIFY]
  - `load-tests/attendance-checkin.js` [MODIFY]
  - `packages/db/index.ts` [MODIFY]
  - `packages/db/schema.pg.ts` [MODIFY]
  - `packages/db/schema.ts` [MODIFY]
  - `src/app/api/upload/process-image/route.ts` [MODIFY]
  - `src/components/examinations/HallTicketDialog.tsx` [MODIFY]
- **Dependencies:** None
- **Acceptance Criteria:**
  - Replaces render-time `Date.now()` calls in `ComplianceMonitor`, `NegotiationTracker`, `RemediationHistory`, and `TelemetryDashboard` with stable state timestamps.
  - Fixes missing dependencies in `HallTicketDialog` hooks.
  - Corrects `prefer-const` violations in test files and schema configurations.
  - Removes unused `eslint-disable` comments.
  - Runs linter cleanly with exit code 0.
- **Verification Method:** Execute `pnpm lint`.
- **Estimated Complexity:** Medium

---

### Phase 4: Testing & Verification

#### Task VPC-011: Playback Controller & Compression Integration Tests
- **Task ID:** VPC-011
- **Description:** Create integration test suites asserting compression utilities, state store transitions, and decompression APIs.
- **Files:**
  - `src/lib/__tests__/playback-compression.test.ts` [NEW]
- **Dependencies:** VPC-001, VPC-005, VPC-006
- **Acceptance Criteria:**
  - Validates all Zustand store action flows (play, pause, step).
  - Asserts compression and decompression byte validity.
  - Verifies `/api/admin/swarm/telemetry` decompresses input streams and stores payload data.
- **Verification Method:** Run `npx jest src/lib/__tests__/playback-compression.test.ts`.
- **Estimated Complexity:** Medium

#### Task VPC-012: E2E Playback UI Test
- **Task ID:** VPC-012
- **Description:** Build end-to-end Playwright tests verifying interactive playback scrubbing controls.
- **Files:**
  - `e2e/swarm-playback-ui.spec.ts` [NEW]
- **Dependencies:** VPC-003, VPC-004
- **Acceptance Criteria:**
  - Test launches dashboard, clicks playback mode toggle, scrubs timeline slider, asserts UI nodes reflect historical dataset time variables, and resumes live stream without console exceptions.
- **Verification Method:** Run `npx playwright test e2e/swarm-playback-ui.spec.ts`.
- **Estimated Complexity:** Medium-High

---

### Phase 5: Documentation & Release Sync

#### Task VPC-013: Runbook & Feature Registry Updates
- **Task ID:** VPC-013
- **Description:** Update swarm operators guide, feature registry, version identifiers, and sprint completion states.
- **Files:**
  - `docs/swarm-observability-remediation-guide.md` [MODIFY]
  - `.ai/FEATURES.md` [MODIFY]
  - `.ai/CHANGELOG.md` [MODIFY]
  - `.ai/PROJECT_STATUS.md` [MODIFY]
- **Dependencies:** VPC-001 through VPC-012
- **Acceptance Criteria:**
  - Guide documents how to operate visual timeline controllers and track telemetry compression metrics.
  - Version v3.6.0 is cataloged in features list, changelog, and project statuses.
- **Verification Method:** Verify git diff files.
- **Estimated Complexity:** Low

---

## Task Summary Table

| Task ID | Phase | Component / Area | Dependencies | Est. Complexity | Target Deliverable |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VPC-001** | Phase 1 | Playback Store | None | Medium | Global playback state manager store (`playback-state.ts`) |
| **VPC-002** | Phase 1 | UI Controller | VPC-001 | Medium | React media playback control bar widget (`PlaybackController.tsx`) |
| **VPC-003** | Phase 1 | UI Integration | VPC-002 | Medium-High | Main dashboard page updates supporting Playback Mode and widgets integration |
| **VPC-004** | Phase 1 | UI Virtualization | VPC-002, 003 | Medium | Virtualized playback list display sidebar (`PlaybackEventList.tsx`) |
| **VPC-005** | Phase 2 | Compression Utils | None | Medium | Compression and decompression helper utilities (`compression.ts`) |
| **VPC-006** | Phase 2 | Ingestion Endpoint | VPC-005 | Medium-High | API endpoint supporting decompressed payload POST queries (`telemetry/route.ts`) |
| **VPC-007** | Phase 2 | SSE Compression | VPC-005 | Medium-High | SSE response stream compression handler integration (`sse-manager.ts`) |
| **VPC-008** | Phase 2 | Savings Tracker | VPC-005, 007 | Medium | Compression savings database tracking and console chart widgets |
| **VPC-009** | Phase 3 | Schema Parity | None | Medium | Automated SQLite index comparison script (`sync-sqlite-indexes.ts`) |
| **VPC-010** | Phase 3 | Lint & React Purity | None | Medium | Resolution of 12 React 19 purity warnings and 17 ESLint warnings across files |
| **VPC-011** | Phase 4 | Integration Tests | VPC-001, 005, 006| Medium | Tests for playback stores, compression logic, and decompression endpoints |
| **VPC-012** | Phase 4 | E2E UI Tests | VPC-003, 004 | Medium-High | E2E Playwright UI playback testing suite (`swarm-playback-ui.spec.ts`) |
| **VPC-013** | Phase 5 | Documentation | VPC-001..012 | Low | Updated runbooks, features registers, changelog, and metadata files |

**Total Tasks:** 13  
**New Source Files:** 7  
**Modified Files:** 15  

---

## Verification Plan & Test Strategy

### Automated Unit & Integration Tests
- **playback-compression.test.ts:** Verifies playback time ranges, speed scaling multipliers, step bounds, compression ratio math, and payload integrity.
- **swarm-playback-ui.spec.ts:** E2E Playwright test verifies slider rendering, clicking play/pause, clicking speeds, and verifying dashboard widget state updates.

### Security Verification
- **Decompression Attack Gates:** Validate size limitations on compressed bodies inside `/api/admin/swarm/telemetry` to reject decompression bomb attacks.
- **Authorization Gate checks:** Verify `/telemetry` endpoint returns 403 on missing permissions.

### Performance Verification
- **Frame Rate Rendering:** Assert that frame rendering during scrubber scrubbing remains > 30 FPS without browser stuttering.
- **Compression Speed:** Gzip compression operations must complete within 2ms for typical event payloads.

---

## Risks & Mitigation Matrix

| Risk Scenario | Impact | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Decompression bomb attacks** | Critical | Low | Restrict maximum compressed payload upload size to 2MB in API. |
| **React layout thrashing during scrub** | Medium | Medium | Use React 19 transitions (`useTransition`) and throttled timeline state updates. |
| **Index mismatches in Drizzle push** | High | Low | Automation script VPC-009 running pre-push validates schemas automatically. |

---

## Rollback & Contingency Plan
1. **Disable Compression:** In case of CPU overhead, set `COMPRESSION_ENABLED=false` to bypass compression.
2. **Decompress Fallback:** Endpoints automatically process raw text payloads if gzip decoding fails.
3. **Rollback to Live Stream:** If Playback Mode encounters state issues, toggle back to live mode to reinitialize the SSE connection and clear playback memory.

---

## Definition of Done
This sprint is certified **COMPLETE** when:
1. **Zero ESLint Warnings/Errors:** `pnpm lint` returns exit code 0.
2. **Type Safety Pass:** `npx tsc --noEmit` returns zero errors.
3. **Test Success:** Integration and E2E suites pass cleanly.
4. **Documentation Sync:** Runbook, features registers, and changelogs are fully synchronized.
