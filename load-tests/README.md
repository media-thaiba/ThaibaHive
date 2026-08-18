# Load & Stress Testing

ThaibaHive uses [k6](https://k6.io) and Node.js benchmark runners for performance and stress testing.

---

## 1. Prerequisites

- Install k6 CLI: https://k6.io/docs/getting-started/installation/
- Running ThaibaHive server (dev or standalone on port 3000)

---

## 2. Test Scripts

| Script | Target Endpoint | Description |
| :--- | :--- | :--- |
| `load-tests/attendance-checkin.js` | `POST /api/attendance/check-in` | Concurrent staff check-in operations |
| `load-tests/exam-tabulation.js` | `GET /api/examinations/tabulation` | High-load exam tabulation queries |
| `load-tests/finance-ledger.js` | `GET /api/accounts` | Financial accounts ledger streaming |
| `load-tests/bi-analytics.js` | `GET /api/analytics` | Workspace and BI aggregation queries |

---

## 3. Running Load Tests

### A. Quick Suite Runner (Local Benchmark)
Runs all 4 benchmarks sequentially with live p50, p95, and error statistics:

```bash
pnpm test:load
```

### B. Direct k6 Runner
```bash
# Run individual script with custom VUs and duration
BASE_URL=http://localhost:3000 AUTH_TOKEN=<jwt> VUS=50 DURATION=15s k6 run load-tests/attendance-checkin.js
```

---

## 4. Performance Gates & Thresholds

All tests in local runs and GitHub Actions CI must satisfy:
- **p95 Latency:** `< 500ms`
- **Error Rate:** `< 5%`

---

## 5. CI Integration

The `load-tests` job in `.github/workflows/ci.yml` runs automatically on pushes to `main` and pull requests. It starts the standalone production build and executes the benchmark suite, asserting performance thresholds before deployment.
