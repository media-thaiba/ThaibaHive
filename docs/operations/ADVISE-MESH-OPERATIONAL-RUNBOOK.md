# ADVISE-MESH / CognitiveDegree OS Operational Runbook

## Overview
ADVISE-MESH is an autonomous multi-agent academic advising and curricular graph optimization platform integrated within the ThaibaHive OS ecosystem. It coordinates five specialist advisor domain agents, executes deterministic degree audits, predicts student attrition risk, and ensures cryptographic Merkle audit integrity.

---

## Architecture Components

1. **Dual-Store Schema**: `curriculumPrograms`, `curriculumCourses`, `curriculumPrerequisites`, `curriculumDegreePlans`, `curriculumPlanCourses`, `curriculumTransferArticulations`, `curriculumAdvisingSessions`, `curriculumAdvisingMessages`, `curriculumRetentionAlerts`, `curriculumAuditLogs`.
2. **Curricular Graph Engine**: Kahn's topological sort for DAG verification, Tarjan's SCC for cycle isolation, and Curricular Complexity Index (CCI) scoring.
3. **Multi-Agent Advising Orchestrator**:
   - `DegreePlannerAgent`: 4-year degree roadmap sequencing
   - `CareerAlignmentAgent`: Industry skills & elective pathways
   - `TransferArticulationAgent`: External credits & transcript evaluation
   - `FinancialAidLoadAgent`: Credit enrollment bounds & overload warnings
   - `AcademicRecoveryAgent`: GPA rehabilitation & probation forgiveness
4. **Deterministic Degree Audit Engine**: Evaluates Major Core, Electives, GenEd, and Residency with SHA-256 Merkle anchoring.
5. **Retention Risk ML Classifier**: Attrition scoring (0.0–1.0) and automated EngageOS multi-channel outreach triggers.
6. **Prometheus Telemetry**: 8 real-time OpenMetrics series.

---

## Operational Verification

### Run Simulation Pipeline
```bash
pnpm advise:simulate
```

### Run Full Unit Test Suite
```bash
pnpm test src/lib/__tests__/operations/curriculum/ src/lib/__tests__/api/curriculum- src/lib/__tests__/db/curriculum-
```

### Run Prometheus Metrics Scrape
```bash
curl -X GET http://localhost:3000/api/metrics
```
