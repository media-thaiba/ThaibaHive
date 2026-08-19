# Automated Dependency Security & Supply Chain Runbook

**Sprint Reference:** Sprint-034 (v3.18.0)  
**Classification:** Enterprise Security & Supply Chain Operations Guide  
**Target Audience:** DevOps, Security Officers, Software Engineers

---

## 1. Automated Dependency Update Lifecycle

ThaibaHive employs hands-free dependency update automation managed via GitHub Dependabot and continuous canary validation:

1. **Scheduled Batching:** Dependencies are scanned on monthly cadences (Mondays 03:00 UTC) grouped into `production-dependencies` and `dev-dependencies`.
2. **Security Immediate Check:** CVE advisories trigger immediate targeted security pull requests.
3. **Automated Canary Validation:** Pull requests trigger `.github/workflows/dependency-canary-validate.yml`:
   - Full TypeScript & lint validation (`pnpm typecheck`, `pnpm lint`)
   - Complete Jest test suite execution (`pnpm test`)
   - Vulnerability and license audits (`pnpm security:deps`, `pnpm security:licenses`)
   - Staging smoke canary run (`pnpm test:staging:smoke`)
   - Zero-regression evaluation gate (`dependency-canary-evaluator.ts`)
4. **Hands-Free Auto-Merge:** If all gates pass (0 errors, <=5% latency delta), GitHub Actions auto-merges the dependency PR.

---

## 2. Managing Security Allowlists

If a dependency has a known CVE with an accepted low risk or no viable upstream fix, it must be documented in `.ai/security-allowlist.json`:

```json
{
  "version": "1.0.0",
  "allowlist": [
    {
      "id": "CVE-2026-XXXX",
      "packageName": "example-pkg",
      "reason": "Vulnerability only affects CLI tool, not invoked in production runtime",
      "approvedBy": "security-lead@thaiba.com",
      "expiresAt": "2026-12-31"
    }
  ]
}
```

---

## 3. Local Audit CLI Commands

```bash
# Run dependency vulnerability audit
pnpm security:deps

# Run open-source license compliance check
pnpm security:licenses

# Dry-run simulate canary evaluation gate
npx tsx scripts/staging/dependency-canary-evaluator.ts --dry-run
```
