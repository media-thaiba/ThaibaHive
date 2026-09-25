# DOC-GEN & ExportHub Disaster Recovery & Backup Guide

## Overview
Procedures for safeguarding document verification signatures, templates, and export queues during unexpected outages or database failovers.

## Backup Verification
- **Dual-Store Redundancy**: All document metadata and verification signatures are written to both SQLite (edge/dev) and PostgreSQL (central cluster).
- **Audit Parity Check**: Run `pnpm db:replica:check` to ensure zero drift between primary and secondary signature registries.

## Recovery Procedures
1. **Signature Key Compromise**:
   - Rotate `DOC_SIGNING_SECRET` environment variable.
   - Run batch re-signature migration on `doc_verification_signatures`.
2. **Export Queue Stoppage**:
   - Query stalled jobs: `SELECT * FROM export_jobs WHERE status = 'processing' AND updated_at < NOW() - INTERVAL '30 minutes';`
   - Re-queue failed jobs: `UPDATE export_jobs SET status = 'queued', progress_percent = 0 WHERE status = 'processing';`
