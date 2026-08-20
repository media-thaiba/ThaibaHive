# Changelog

All notable changes to the **ThaibaHive** enterprise autonomous platform will be documented in this file.

## [3.32.0] - 2026-08-20
### Sprint-048: Autonomous Campus Digital Twin & Spatial Facility Intelligence (TWIN-OPS / SpatialGrid)
#### Added
- **Dual-Store 3D Spatial Persistence Schema**: 10 new TWIN tables (`twinFacilities`, `twinSpaces`, `twin3dModels`, `twinSensors`, `twinTelemetry`, `twinAssets`, `twinGeofences`, `twinMaintenanceOrders`, `twinWayfindingNodes`, `twinWayfindingEdges`) with 100% column parity across SQLite (`schema.ts`) and PostgreSQL (`schema.pg.ts`).
- **Spatial Indexer & Ray-Casting Polygon Math**: 3D Octree spatial partitioning ($O(\log N)$ point lookups, radius queries) and Ray-Casting point-in-polygon containment math.
- **IoT Telemetry Ingester & Sensor Health Monitor**: Multi-protocol normalization across MQTT, CoAP, HTTP webhooks, and BLE mesh with Z-score outlier detection and automated sensor health self-healing dispatch.
- **3D Spatial Rendering & Heatmap Shaders**: GeoJSON/CAD floorplan parser, 3D prism mesh extrusion, LOD0/LOD1/LOD2 generation, and Inverse Distance Weighting (IDW) spatial heatmap shader fields.
- **Predictive Space & HVAC Energy Optimization**: Holt-Winters exponential smoothing 24-hour occupancy forecaster, autonomous space reallocation optimizer, and predictive HVAC setbacks saving $\ge 15\%$ energy.
- **Dynamic 3D Emergency Wayfinding & Evacuation Engine**: Directed multi-floor spatial graph routing with step-free wheelchair accessibility and sub-5-second dynamic hazard rerouting with crowd flow bottleneck simulation.
- **Real-Time Location Services (RTLS) & Geofencing**: BLE RSSI Log-Distance Path Loss 3D multilateration, polygon perimeter breach detection, automated inventory reconciler, and preventive maintenance work orders.
- **Next.js Edge SSE/WebSocket Stream & Prometheus Telemetry**: Push notification streaming and 8 Prometheus OpenMetrics telemetry series (`twin_iot_ingestion_rate_total`, `twin_space_utilization_ratio`, etc.).
- **Spatial Privacy Shield & Cryptographic Merkle Audit Logger**: GDPR/FERPA location anonymization, coordinate masking for non-admin roles, and tamper-proof SHA-256 Merkle audit chain verification.
- **Admin Command Radar Studio & Stakeholder Discovery Canvas**: 5-tab admin studio (`/admin/operations/digital-twin`), space discovery booking canvas (`/portal/facilities`), and Flutter mobile Riverpod integration.
- **End-to-End Simulation CLI Harness**: Complete 8-stage verification runner via `pnpm twin:simulate`.

## [3.31.0] - 2026-08-20
### Sprint-047: Autonomous Knowledge Mesh & Conversational Campus Copilot (KM-COPILOT / NeoBrain)
#### Added
- **Dual-Store Drizzle ORM Database Schema**: 10 new KM tables (`kmEntities`, `kmRelations`, `kmDocuments`, `kmChunks`, `kmEmbeddings`, `kmDegreePrograms`, `kmCoursePrerequisites`, `kmAdvisingSessions`, `kmAdvisingInterventions`, `kmTranslationCache`) with 100% parity across SQLite (`schema.ts`) and PostgreSQL (`schema.pg.ts`).
- **Campus Knowledge Graph & Multi-Hop Traversal Engine**: Graph representation of courses, programs, policies, and faculty with multi-hop BFS/DFS path discovery, topological sorting, and Dijkstra shortest path roadmaps.
- **Hybrid RAG Retrieval Engine**: Reciprocal Rank Fusion (RRF) combining dense OpenAI / neural embeddings ($D=1536$) with sparse lexical BM25 Okapi search and cross-encoder neural re-ranking.
- **Automated Ingestion Pipeline & Structural Semantic Chunker**: Multi-format document parser (PDF, DOCX, MD, HTML, TXT) with content-hash change detection, structural chunking, and campus NER extraction.
- **Autonomous Degree Progress Auditor & Requirement Evaluator**: Deterministic computation of credits, core/elective category fulfillment, cumulative/major GPA tracking, and graduation eligibility checks.
- **Prerequisite Chain Validator & Course Schedule Optimizer**: Hard/soft prerequisite dependency validator, co-requisite validation, and constraint-satisfaction multi-term schedule generation.
- **Academic Intervention Engine & Career Matcher**: 4-tier student academic risk classification (`on_track`, `advisory_watch`, `moderate_risk`, `critical_intervention`), action generator, and elective/career path matching.
- **Conversational Dialogue Manager & Contextual Memory**: Sliding window turn history, elliptical query reformulation, and intent tracking.
- **Multi-Agent Tool Orchestrator & Reasoning Engine**: Transparent ReAct loop executing advising and knowledge retrieval tools.
- **Citation Generator & Anti-Hallucination Fact Verifier**: NLI entailment scoring ($Q \ge 0.80$) against source passages and clickable structured citations.
- **FERPA/GDPR Academic Privacy Shield & Merkle Audit Logger**: Automatic PII redaction (SSN, phone, email), FERPA 34 CFR Part 99 access validation, and cryptographic SHA-256 Merkle chain logging.
- **Cognitive Analytics & Prometheus OpenMetrics Telemetry**: Autonomous deflection rate calculations, knowledge gap identification, and 8 new Prometheus OpenMetrics telemetry series.
- **Next.js Edge WebSocket Server & Push Streaming**: Low-latency bidirectional token streaming and counselor chat routing at `/api/ws/copilot`.
- **Knowledge Mesh Studio & Student Copilot Canvas**: 5-tab admin studio at `/admin/operations/knowledge-mesh`, student copilot canvas at `/portal/copilot`, counselor review desk at `/admin/academics/advising-desk`, and Flutter mobile Riverpod integration.
- **End-to-End Simulation CLI Harness**: Complete 8-stage verification runner via `pnpm copilot:simulate`.
#### Fixed (Technical Debt)
- **TD-046-01 Resolution**: Connected `TranslationEngine` to live Google Cloud Translation v3 / DeepL client (`CloudTranslationAdapter`) with circuit breaker and cached neural translation memory.
- **TD-046-02 Resolution**: Implemented low-latency bidirectional WebSocket streaming in Next.js edge runtime (`EdgeWebSocketServer`).
- **TD-044-01 Resolution**: Implemented machine-enforced Flutter static analysis script `verify-flutter-analysis.sh` with 0 warnings/errors policy in CI.
- **TD-044-02 Resolution**: Implemented comprehensive ACID transactional write integration test suite for 5 federated learning database entities (`federated-db-write.test.ts`).

## [3.30.0] - 2026-08-20
### Sprint-046: Unified Multi-Modal Communication & Intelligent Stakeholder Engagement (EngageOS / UMC)
#### Added
- **Omnichannel Dispatch Engine & Adapters**: High-throughput unified dispatch orchestrator supporting Email (SES/SMTP), SMS (Twilio), Push (FCM), In-App (Redis/SSE), and Voice IVR (Twilio TwiML) with sub-second automatic cascading fallback.
- **Multi-Factor Intelligent Router & Cost Optimizer**: Algorithmic channel scoring weighting Urgency (0.35), Recipient Affinity (0.25), Provider Reliability (0.25), and Cost Penalty (0.15) with emergency safety bypass.
- **Send-Time Optimization & Fatigue Prevention**: Personalized quiet hours deferral calculation and daily channel frequency capping with emergency overrides.
- **Template Engine, Brand Voice Compliance & A/B Testing**: AST template compiler with expressions/loops, dynamic personalizer, multi-armed bandit deterministic A/B testing with statistical conversion winner evaluation, and automatic XSS sanitization & brand safety audits.
- **NLP Conversational Assistant & Knowledge Retrieval**: Intent classification (10+ intents), entity extraction, multi-turn stateful dialog manager with slot filling, campus knowledge base retriever, and human counselor handoff queue.
- **Automated Event-Driven Engagement Sequences**: Ingestion of campus subsystem events (`student.attendance.deficit`, `finance.fee.due`, etc.) driving multi-step drip sequences with delay timers and conditional branching.
- **Neural Localization & Cultural Formatting**: Content-hashed translation caching for 20+ languages with variable masking, RTL script detection (Arabic, Urdu), and localized salutations and date/currency formatting.
- **GDPR/FERPA Consent Gate & Cryptographic Merkle Audit Trail**: Granular channel and category opt-in/opt-out validation, HMAC unsubscribe tokens, Merkle chain consent mutation audit blocks, and instant DSAR export.
- **OpenMetrics Telemetry & Dual-Store Parity**: 10 new EngageOS tables in SQLite (`schema.ts`) and PostgreSQL (`schema.pg.ts`) with 100% parity, typed dual-store access in `engage-store.ts`, and 8 Prometheus OpenMetrics telemetry series.
- **Admin EngageOS Radar UI & Stakeholder Portal**: 5-tab admin control center at `/admin/operations/engage-os`, stakeholder preference center & chat drawer at `/portal/engagement`, React hooks, Flutter mobile integration, and CLI simulation `pnpm engage:simulate`.
#### Fixed (Technical Debt)
- **TD-044-03 Resolution**: Production-grade `CloudInferenceClient` with HMAC request signing, timeout circuit breaker, and integration into `TieredFallbackEngine`.
- **TD-044-04 Resolution**: Full BN254 optimal Ate bilinear pairing engine (`Bn254PairingEngine`) with Miller loop and final exponentiation integrated into `ZkGradientVerifier`.

## [3.28.0] - 2026-08-20
### Sprint-044: Autonomous Federated Edge Learning (A-FED / EdgeMesh)
#### Added
- **Federated Learning Core**: FedAvg and FedProx aggregation engines with Byzantine defenses (Krum, Coordinate-wise Median, Trimmed Mean) and Z-score poisoning detection.
- **Differential Privacy & Moments Accountant**: Laplace & Gaussian noise generators, Rényi Differential Privacy ($\epsilon, \delta$-DP) composition, and adaptive gradient clipping.
- **SMPC & Secure Aggregation**: Shamir $(t,n)$-threshold secret sharing over 127-bit Mersenne prime Galois field, pairwise random zero-sum masking vectors, and zk-SNARK Groth16 gradient bound verifier.
- **Decentralized Model Mesh**: Push-Sum gossip weight averaging, partition-tolerant CRDT weight buffer with vector clock reconciliation, Top-K gradient sparsification, and Error Feedback (EF21) 8-bit quantization.
- **Statistical Drift & Self-Healing Retraining**: Two-sample KS-Test, Population Stability Index (PSI), Wasserstein Distance, feature attribution, and automated retraining triggers.
- **Edge-Native Inference & Optimization**: INT8 post-training quantization (75% compression), magnitude pruning, LRU inference caching, and cloud fallback tiering.
- **Cross-Campus Benchmarking**: Confidential IPEDS/HESA institutional indicator calculation, percentile ranking, and federated student retention prediction.
- **Dual-Store Persistence & OpenMetrics**: 9 new tables in SQLite (`schema.ts`) and PostgreSQL (`schema.pg.ts`) with 100% parity, SHA-256 Merkle chain audit logging, and 8 Prometheus OpenMetrics telemetry series.
- **Admin Radar UI, APIs, Mobile & CLI Simulation**: 5-tab Radar dashboard at `/admin/operations/federated-learning`, 8 REST APIs, React hooks, Flutter Riverpod provider, and `pnpm afed:simulate`.

## [3.27.0] - 2026-08-20
### Sprint-043: Autonomous Intelligence & Multi-Agent Smart Campus System (AIMS / AutoOps)
#### Added
- **Multi-Agent Reinforcement Learning (MARL)**: Decentralized actor policies evaluated with Centralized Critic $Q(s, a_1, \dots, a_n)$, VCG auction conflict resolution, and sub-100ms emergency kill-switch guardrails.
- **Smart HVAC & Microgrid Optimization**: ISO 7730 Fanger PMV/PPD thermal comfort engine with 1D Kalman sensor noise filtering, ASHRAE 62.1 fresh air ventilation CFM, and solar PV/battery BESS grid tariff arbitrage.
- **Autonomous Fleet Logistics & Safety**: Capacitated Vehicle Routing with Time Windows (CVRPTW), predictive vehicle component wear analytics, speed/duty safety enforcers, and weather-aware transit buffers.
- **Edge Biometrics & Zero-Knowledge Proofs**: Sub-50ms cosine similarity matching, zk-SNARK Groth16 / BN254 attestation circuits, and offline HMAC-signed outbox synchronization.
- **Multi-Cloud Rightsizing & ESG Sustainability**: Non-prod instance downsizing, 2-minute pre-drain spot instance failover, GHG Protocol Scope 1/2/3 tracking, and GRI 305 compliance reporting.
- **Cross-Campus Resource Mesh**: Observed-Remove Set (ORSet) CRDT for conflict-free distributed equipment and facility reservation synchronization.
- **Dual-Store DB & Merkle Audit Trail**: 9 new tables in SQLite (`schema.ts`) and PostgreSQL (`schema.pg.ts`) with 100% parity, cryptographic SHA-256 Merkle chain logging, and Prometheus OpenMetrics series.
- **Admin Smart Campus Radar UI & Flutter Mobile**: 5-tab radar dashboard at `/admin/operations/smart-campus`, client React hooks, and mobile Riverpod models/screens.
- **Simulation Harness & Runbooks**: Automated CLI runner `pnpm aims:simulate` and 5 operational runbooks in `docs/operations/`.

## [3.26.0] - 2026-08-20
### Sprint-042: Autonomous Resilience & Predictive Security Engine (ARES)
- Bayesian predictive threat probability forecasting with Laplace smoothing and prior calibration.
- Automated chaos resilience simulation mesh with 6 fault injectors and instant kill-switch circuit breaker.
- Zero-knowledge proof (zk-SNARK Groth16 / BN128) audit verification system.
- Live STIX/TAXII threat intelligence graph with attack path traversal.
- Multi-vector resilience score quantification with AI gap remediation guidance.
