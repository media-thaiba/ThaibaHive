# Build Bundler Decision: Webpack Configuration (R9-1)

**Date**: 2026-10-04  
**Status**: Adopted

---

## 1. Background & Context

Next.js 16 defaults to Turbopack for production builds. However, in our repository's pnpm monorepo structure on Windows (incorporating packages like `@thaiba/auth` and `@thaiba/db` linked via pnpm workspaces), Turbopack's workspace root resolution encounters symlink resolution barriers when attempting to locate `next/package.json` relative to subdirectories such as `src/app`.

## 2. Decision

We explicitly configure `next build --webpack` in `package.json` with dedicated memory headroom:
```json
"build": "cross-env NODE_OPTIONS=\"--max-old-space-size=8192\" next build --webpack"
```

## 3. Guarantees & Verification
1. **Type Validation is 100% Enabled**: No `typescript.ignoreBuildErrors` or `eslint.ignoreDuringBuilds` flags are present in `next.config.ts`. The build pipeline executes full TypeScript compilation (`Running TypeScript ... Finished TypeScript in 16.6s ...`) and generates static pages for all 419 routes.
2. **Environment Consistency**: All build invocations across local environments, `.github/workflows/ci.yml` (line 77), and deployment preflight scripts trigger the unified `pnpm build` script.
3. **Automated Guardrail**: A dedicated Jest test suite (`src/lib/__tests__/build-config-guard.test.ts`) guarantees that no `ignoreBuildErrors` or bypass flags can be committed to `next.config.ts`.
