# Frontend Bundle Size Budgets

**Version:** 3.15.0  
**Baseline Date:** 2026-08-18  
**Policy:** Maximum +10% First Load JS regression tolerance against baseline.

---

## 1. Dynamic Import Page Size Budgets

The following budgets are enforced for high-weight analytics and register routes code-split in v3.14.0+:

| Route | Page Name | Baseline First-Load JS | Budget Threshold (+10%) | Dynamic Chunk Target | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/(shell)/admin/executive/analytics` | Executive Analytics Dashboard | 178.4 KB | **196.2 KB** | `< 45.0 KB` | ✅ Compliant |
| `/(shell)/admin/swarm-intelligence` | Swarm Intelligence Telemetry | 185.3 KB | **203.8 KB** | `< 52.0 KB` | ✅ Compliant |
| `/(shell)/examinations/tabulation` | Tabulation Register | 162.9 KB | **179.2 KB** | `< 35.0 KB` | ✅ Compliant |
| `/(shell)/workspace/[role]/analytics` | Role BI Analytics | 171.8 KB | **189.0 KB** | `< 42.5 KB` | ✅ Compliant |

---

## 2. Generating & Inspecting Bundle Reports

Run the bundle analyzer using:

```bash
pnpm build:analyze
```

This sets `ANALYZE=true` and invokes Next.js Webpack / Turbopack with `@next/bundle-analyzer`, generating interactive visual reports:
- Client bundle tree map: `.next/analyze/client.html`
- Server bundle tree map: `.next/analyze/server.html`

---

## 3. Regression Remediation Protocol

If a PR or dependency update causes a route to exceed its budget threshold:
1. Identify unexpected vendor imports included in the main entrypoint instead of dynamic chunks.
2. Check `next.config.ts` `experimental.optimizePackageImports` configuration for large tree-shakeable packages.
3. Ensure heavy third-party visualization libraries (`recharts`, `pdfkit`, `exceljs`) are strictly imported via `next/dynamic` with `ssr: false` where server rendering is not required.
4. Update `bundle-analysis/baseline-vX.Y.Z.json` upon intentional major feature additions approved by the Architecture Lead.
