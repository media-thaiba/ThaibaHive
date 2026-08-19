# Sprint-031 Recommendation: Cross-Browser E2E Hardening, CI Load Test Integration & Data Integrity Guardrails

**Date:** 2026-08-18  
**Recommended By:** Product Engineering Manager  
**Sprint ID:** SPRINT-031  
**Target Release:** v3.15.0

---

## Sprint Name
**Cross-Browser E2E Hardening, CI Load Test Integration & Data Integrity Guardrails**

---

## Business Goal
Hardening the ThaibaHive platform's quality assurance infrastructure by addressing critical gaps in cross-browser validation, automated performance regression detection, and data integrity guardrails. This sprint eliminates the structural weaknesses that caused verification issues in Sprint-030 and establishes enterprise-grade CI/CD automation for ongoing quality assurance.

---

## User Value
- **Cross-Browser Compatibility**: Ensure consistent user experience across Chromium, Firefox, and WebKit browsers, validating that the platform works correctly for all users regardless of browser choice
- **Automated Performance Protection**: Continuous load testing in CI/CD prevents performance regressions from reaching production, protecting users from degraded experience
- **Reliable Test Infrastructure**: Elimination of brittle test timeouts reduces false-positive test failures, speeding up development cycles and reducing frustration
- **Data Integrity Assurance**: Versioned pre-migration scripts ensure database migrations succeed consistently across all environments, preventing deployment failures

---

## Business Impact
- **Reduced Production Risk**: Cross-browser validation catches browser-specific bugs before they affect end users, reducing support incidents and user frustration
- **Performance Regression Prevention**: Automated CI load testing creates a safety net that prevents performance degradation from being deployed, protecting the user experience as the platform scales
- **Faster Development Cycles**: Reliable E2E tests without flaky timeouts reduce debugging time and accelerate feature delivery
- **Deployment Confidence**: Data integrity guardrails ensure database migrations are repeatable and safe, reducing deployment anxiety and failed migration attempts
- **Infrastructure Maturity**: CI/CD automation moves the platform from manual quality gates to automated regression detection, a critical maturity milestone for enterprise adoption

---

## Technical Impact
- **Cross-Browser E2E Matrix**: Extension of Playwright CI jobs to run the full 74-check E2E suite against Firefox and WebKit in addition to Chromium, catching browser-specific rendering, SSE handling, and cookie security issues
- **Test Reliability Engineering**: Systematic replacement of `waitForTimeout()` calls with deterministic element waits, eliminating the primary source of E2E flakiness
- **CI/CD Performance Gates**: Integration of k6 load testing into GitHub Actions with threshold assertions, creating automated performance regression detection
- **Database Migration Safety**: Versioning of pre-migration data scrubbing scripts as committed migration hooks, ensuring reproducible database upgrades
- **Bundle Size Observability**: Implementation of `@next/bundle-analyzer` to establish quantitative baseline measurements for dynamic import optimizations

---

## Dependencies
- **Sprint-030 Completion**: Leverages the modernized E2E suite, k6 load test scripts, and dynamic import optimizations delivered in v3.14.0
- **E2E StorageState Infrastructure**: Depends on the storageState-based authentication patterns established in Sprint-030
- **k6 Load Test Scripts**: Utilizes the four production-ready k6 scripts created in Sprint-030 (attendance, exams, finance, analytics)
- **Dynamic Import Pages**: Builds upon the 4 dashboard routes with code-split components for bundle size measurement
- **PostgreSQL Migration Pipeline**: Requires stable Drizzle ORM migration infrastructure for pre-migration hook integration

---

## Risks
- **Cross-Browser Environment Setup**: Firefox and WebKit may require additional CI environment configuration or driver installation, potentially extending setup time
- **Browser-Specific Test Failures**: SSE handling, cookie security, or rendering differences may cause browser-specific test failures that require debugging and fixes
- **k6 CI Environment Limitations**: Load testing against staging may have resource constraints or rate limits that differ from the manual baseline environment
- **Deterministic Wait Complexity**: Replacing `waitForTimeout()` with deterministic waits may be challenging for certain async operations without clear UI signals
- **Bundle Analyzer Configuration**: `@next/bundle-analyzer` may require Next.js configuration changes or environment variable setup that could affect build process

---

## Estimated Size
**Medium Sprint** (Estimated 6-9 development days)

- Cross-Browser E2E Validation: 2-3 days
- Replace `waitForTimeout` Commit Guards: 1-2 days
- k6 CI Integration: 1-2 days
- Pre-Migration Scrubbing Hooks: 1 day
- Bundle Size Measurement: 1 day
- Integration & Verification: 1-2 days

---

## Success Criteria

### Cross-Browser E2E Validation (TD-002)
- [ ] Full 74-check Playwright E2E suite passes on Firefox locally
- [ ] Full 74-check Playwright E2E suite passes on WebKit locally
- [ ] Firefox and WebKit added to GitHub Actions CI matrix
- [ ] All browser-specific failures identified and resolved
- [ ] Cross-browser execution time maintained under 60 seconds for full suite

### Replace `waitForTimeout` Commit Guards (TD-001)
- [ ] Audit completed identifying all `waitForTimeout()` calls in `e2e/` directory
- [ ] All `waitForTimeout()` calls replaced with deterministic element waits
- [ ] Zero `waitForTimeout()` calls remain in E2E suite
- [ ] Multi-stage approval flow tests pass reliably without hardcoded sleeps
- [ ] Test flakiness reduced in local and CI environments

### k6 CI Integration (TD-003)
- [ ] GitHub Actions workflow created for k6 load testing
- [ ] k6 job configured to run against staging environment post-deploy
- [ ] Threshold assertions configured (p95 < 500ms for all endpoints)
- [ ] CI pipeline fails if performance thresholds are breached
- [ ] Load test results published as CI artifacts for review

### Pre-Migration Scrubbing Hooks (TD-004)
- [ ] `mark_entries` deduplication script committed to version control
- [ ] Script integrated as a pre-migration hook in Drizzle migration pipeline
- [ ] Migration documentation updated with scrubbing instructions
- [ ] Pre-migration audit query added for duplicate detection
- [ ] Pattern documented for future unique constraint migrations

### Bundle Size Measurement (TD-006)
- [ ] `@next/bundle-analyzer` installed and configured
- [ ] Bundle analysis run for all 4 dynamic import pages
- [ ] Baseline bundle sizes documented for each chunk
- [ ] Size budgets established for future regressions
- [ ] Bundle analysis integrated into build process for ongoing monitoring

### Integration & Verification
- [ ] All changes pass existing Jest unit tests (873 tests)
- [ ] All changes pass existing Playwright E2E tests (74 checks)
- [ ] Build passes with zero errors and zero warnings
- [ ] TypeScript compilation passes with zero errors
- [ ] Cross-browser CI matrix verified in GitHub Actions
- [ ] Documentation updated (PROJECT_STATUS.md, CHANGELOG.md, AIOS documents)

---

## Rationale

This sprint directly addresses the technical debt and infrastructure gaps identified in the Sprint-030 retrospective, which caused a 2-cycle verification loop and exposed critical weaknesses in the quality assurance infrastructure. The retrospective specifically recommended these five priority items for Sprint-031:

1. **Cross-Browser E2E Gap (TD-002)**: Currently only Chromium is validated in CI. Firefox and WebKit users represent a significant portion of the user base, and browser-specific issues (SSE handling, cookie security, rendering differences) could affect production users without detection.

2. **Test Reliability (TD-001)**: The `waitForTimeout(1500)` commit guards in `approvals.spec.ts` are a code smell and a source of flakiness. Systematic elimination of hardcoded sleeps creates more reliable, faster-running tests.

3. **CI/CD Performance Protection (TD-003)**: Load testing is currently manual only. Without automated regression detection, performance degradations could be deployed to production without warning, especially as the platform scales to multi-institution deployment.

4. **Data Integrity Safety (TD-004)**: The pre-migration scrubbing script was manual and not versioned. This creates a deployment risk where migrations could fail on different environments due to data inconsistencies.

5. **Bundle Size Observability (TD-006)**: Dynamic import improvements were qualitative only. Without quantitative baselines, future regressions cannot be detected, and the true impact of optimizations cannot be measured.

The platform is 100% feature complete, making infrastructure hardening and technical debt cleanup the highest-value work. This sprint establishes enterprise-grade quality assurance automation that will protect the platform as it scales to production multi-institution deployment.

---

## Recommendation

**APPROVED** for Sprint-031 implementation.

This sprint addresses critical infrastructure gaps that directly caused verification issues in Sprint-030 and establishes the automated quality assurance foundation necessary for confident production scaling. The work is well-scoped, builds directly on Sprint-030 deliverables, and provides clear risk reduction and process automation value.

---

*Recommendation generated — 2026-08-18 (Product Engineering Manager)*
