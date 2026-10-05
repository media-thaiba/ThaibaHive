# Root Cause Analysis: ThaibaHive CI Run #37277936645 Failures (F1 & F2)

This document details the exact error logs, root cause analysis, and remediation actions for all failed jobs in GitHub Actions run [`37277936645`](https://github.com/media-thaiba/ThaibaHive/actions/runs/37277936645) on branch `audit/final`.

---

## 1. k6 CI Load & Stress Tests (Job ID: `111663300967`)

### Raw Error Log Excerpt
```text
  - HEALTH_SECRET: Missing required health probe authentication secret
  - METRICS_SECRET: Missing required Prometheus metrics scrape secret
  - PII_ENCRYPTION_KEY: Missing required AES-256 field encryption key
  - RECEIPT_SIGNING_KEY: Missing required 80G receipt signing key

Refusing to boot in production mode with insecure or incomplete configuration.
    at cL (.next/server/chunks/62508.js:62:25483)
    at Module.d (.next/server/instrumentation.js:1:577)

  ✗ THRESHOLDS 
    failed_requests
    ✗ 'rate<0.05' rate=100.00%

    http_req_duration
    ✓ 'p(95)<500' p(95)=2.72ms

  ✗ TOTAL RESULTS 
    checks_succeeded...: 50.00% 4930 out of 9860
    checks_failed......: 50.00% 4930 out of 9860
    ✗ status is 200, 201 or 400
      ✗  0% - ✗ 0 / ✓ 4930
    ✓ response time < 500ms

    CUSTOM
    failed_requests......: 100.00% 4930 out of 4930

time="2026-10-05T07:46:41Z" level=error msg="thresholds on metrics 'failed_requests' have been crossed"
##[error]Process completed with exit code 99.
```

### Root Cause
- When `node .next/standalone/server.js` was launched inside CI under `NODE_ENV=production`, the application security instrumentation (`src/lib/api/security-runtime.ts`) verified the required cryptographic secrets.
- The `load-tests` job in `.github/workflows/ci.yml` only generated and passed `AUTH_JWT_SECRET`, omitting `HEALTH_SECRET`, `METRICS_SECRET`, `PII_ENCRYPTION_KEY`, `RECEIPT_SIGNING_KEY`, `MDM_ENROLLMENT_TOKEN`, `PAYMENT_ENCRYPTION_KEY`, and `SYSTEM_UPDATE_SECRET`.
- The standalone Next.js server halted with `Refusing to boot in production mode with insecure or incomplete configuration`. Consequently, all 4,930 k6 requests failed (100% failure rate against a dead HTTP server), breaching the `failed_requests: rate < 0.05` threshold and causing k6 to exit with code 99.
- Notice that `http_req_duration` was `p(95)=2.72ms` (well below the 500ms threshold). The failure was purely due to missing boot environment secrets.

### Remediation
- Added a full ephemeral secrets generator step to `load-tests` in `.github/workflows/ci.yml` providing `HEALTH_SECRET`, `METRICS_SECRET`, `PII_ENCRYPTION_KEY`, `RECEIPT_SIGNING_KEY`, `MDM_ENROLLMENT_TOKEN`, `PAYMENT_ENCRYPTION_KEY`, `SYSTEM_UPDATE_SECRET`, `BIOMETRIC_MASTER_KEY`, `TENANT_ENCRYPTION_MASTER_KEY`, `ENCRYPTION_KEY`, and `JWT_SECRET`.

---

## 2. Platform OS Simulation (alumni) (Job ID: `111663301092`)

### Raw Error Log Excerpt
```text
  ✓ Mentorship Session Completed: Rating ★5 / 5.0

🎓 Stage 4: Alumni Job Board Posting & Fast-Track Application...
  💼 Applications Hired: 1 / 1 (100%)

🏛️ Stage 5: Endowment Campaign & Double-Entry GL Ledger Balancing...
Alumni simulation failed: Error: RECEIPT_SIGNING_KEY is not configured. A valid cryptographic key is required.
    at Receipt80GGenerator.getSigningKey (/home/runner/work/ThaibaHive/ThaibaHive/src/lib/operations/alumni/endowments/receipt-80g-generator.ts:26:13)
    at Receipt80GGenerator.computeReceiptHash (/home/runner/work/ThaibaHive/ThaibaHive/src/lib/operations/alumni/endowments/receipt-80g-generator.ts:38:22)
    at Receipt80GGenerator.compileReceiptDocument (/home/runner/work/ThaibaHive/ThaibaHive/src/lib/operations/alumni/endowments/receipt-80g-generator.ts:56:30)
    at DonationFinanceBridge.processConfirmedDonation (/home/runner/work/ThaibaHive/ThaibaHive/src/lib/operations/alumni/endowments/donation-finance-bridge.ts:171:43)
    at async runAlumniSimulation (/home/runner/work/ThaibaHive/ThaibaHive/scripts/alumni-simulate.ts:201:23)
 ELIFECYCLE  Command failed with exit code 1.
##[error]Process completed with exit code 1.
```

### Root Cause
- In Stage 5 of `scripts/alumni-simulate.ts`, the simulation exercises 80G tax receipt PDF generation and SHA-256 HMAC digital signing via `Receipt80GGenerator.getSigningKey()`.
- The `platform-simulations` matrix job in `.github/workflows/ci.yml` lacked ephemeral secret provisioning, so `RECEIPT_SIGNING_KEY` was undefined in the runner environment.
- The other 9 simulation modules (fee, twin, eco, vision, docgen, copilot, facility, supply, neuro) succeeded because they do not call the 80G receipt signing bridge.

### Remediation
- Added an ephemeral test secrets setup step in `platform-simulations` defining `RECEIPT_SIGNING_KEY` and other cryptographic keys for all matrix runs.

---

## 3. Playwright E2E Tests (9 Shards: Chromium 1-3, Firefox 1-3, WebKit 1-3)

### Raw Error Log Excerpt (Job ID: `111663301112`)
```text
##[group]Run mkdir -p .next
mkdir -p .next
tar -xzf e2e-standalone.tar.gz -C .next
test -f .next/standalone/server.js
test -d .next/standalone/.next/server
node -e "const fs=require('fs');const {pathToFileURL}=require('url');const dir=process.cwd()+'/.next/standalone/.next/node_modules/@libsql';const entry=fs.readdirSync(dir).find(d=>d.startsWith('client-'));if(!entry)throw new Error('hashed @libsql/client entry missing');const p=dir+'/'+entry;console.log('entry is symlink:',fs.lstatSync(p).isSymbolicLink());import(pathToFileURL(p+'/lib-esm/node.js').href).then(()=>console.log('OK runtime import: @libsql/client loaded')).catch(e=>{console.error(e);process.exit(1)})"
echo "Standalone build verified with symlinks intact: .next/standalone/server.js"
##[endgroup]

node:fs:1521
  const result = binding.readdir(
                         ^

Error: ENOENT: no such file or directory, scandir '/home/runner/work/ThaibaHive/ThaibaHive/.next/standalone/.next/node_modules/@libsql'
    at Object.readdirSync (node:fs:1521:26)
    at [eval]:1:147
    at runScriptInThisContext (node:internal/vm:209:10)
    at node:internal/process/execution:118:14
    at [eval]-wrapper:6:24
    at runScript (node:internal/process/execution:101:62)
    at evalScript (node:internal/process/execution:133:3)
    at node:internal/main/eval_string:51:3 {
  errno: -2,
  code: 'ENOENT',
  syscall: 'scandir',
  path: '/home/runner/work/ThaibaHive/ThaibaHive/.next/standalone/.next/node_modules/@libsql'
}

Node.js v20.20.2
##[error]Process completed with exit code 1.
##[warning]No files were found with the provided path: playwright-report/ test-results/. No artifacts will be uploaded.
```

### Root Cause
- Next.js 16 standalone output places traced packages in `.next/standalone/node_modules/@libsql/client` (not `.next/standalone/.next/node_modules/@libsql/`).
- The inline Node pre-flight assertion script in `.github/workflows/ci.yml:311` had a hardcoded path error (`/.next/standalone/.next/node_modules/@libsql`).
- This pre-flight validation failed with `ENOENT` before `pnpm exec playwright test` was ever called, which is why all 9 shards failed immediately and produced no `playwright-report` or `test-results` artifacts.

### Remediation
- Corrected the standalone extraction and validation path in `.github/workflows/ci.yml` to verify `.next/standalone/server.js` and `.next/standalone/node_modules/@libsql`.
- Ensured all 9 shards receive required environment secrets so the standalone server boots cleanly during test execution.

---

## 4. Master vs Branch Regression Analysis

| Failure | Present on `master`? | Notes |
|---|---|---|
| `k6` exit code 99 | Yes (on `master` / `audit/antigravity-r1` when standalone build is tested under strict production runtime checks) | Caused by runtime security enforcement introduced in Sprint-050/051 without updating CI secrets in `load-tests` job. |
| `Platform OS Simulation (alumni)` | Yes (on `master` whenever `alumni:simulate` was invoked without `RECEIPT_SIGNING_KEY`) | Added in Sprint-048 alumni endowments; CI matrix lacked secret. |
| Playwright pre-flight `ENOENT` | Regression introduced during tar extraction refactoring in `ci.yml`. | Fixed path resolution. |
