# FERPA & GDPR Academic Privacy Shield Guide

## Privacy & Compliance Architecture
1. **Automated PII Redaction:** Strips SSNs, phone numbers, and personal emails before LLM context ingestion.
2. **FERPA Access Control:** Enforces student-record privacy barriers under 34 CFR Part 99.
3. **Cryptographic Merkle Audit Trail:** Anchors all AI queries and audit decisions in deterministic SHA-256 hash chains (`pnpm compliance:verify`).
4. **Anti-Hallucination Verification:** Evaluates NLI entailment scores ($Q \ge 0.80$) against source passages.
