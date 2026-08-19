# Operational Runbook: TypeScript AST Route Scanner Engine

## Overview
`scripts/security/gateway-coverage-scanner.ts` leverages the official TypeScript Compiler API to perform deep Abstract Syntax Tree (AST) node traversal across all 370+ platform API route handlers.

## Scan Criteria
1. **Module Presence**: Asserts all 26 core gateway security modules exist.
2. **Security Decoration**: Traverses CallExpressions to verify that each exported HTTP method is guarded by `requireAuth`, `withRateLimit`, `withDPoP`, or `verifyWebhookHmac`.
3. **Secret Leak Prevention**: Scans security files for accidental hardcoded API tokens or secret keys.

## CI/CD Usage
```bash
# Run standalone AST security scan
pnpm gateway:scan

# Run unit tests
pnpm jest scripts/security/__tests__/gateway-coverage-scanner.test.ts
```
