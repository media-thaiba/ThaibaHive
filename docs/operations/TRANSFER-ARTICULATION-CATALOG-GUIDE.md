# Transfer Credit Articulation & Institutional Catalog Guide

## Overview
Automates external transcript ingestion via OCR regex token parsing and semantic vector similarity matching against the active institutional course catalog.

## Decision Thresholds
- **Score $\ge 0.75$ & Grade $\ge$ C**: Direct equivalent mapping (`exact_equivalent`).
- **Score $0.50 - 0.74$ & Grade $\ge$ C**: Departmental faculty review required (`department_review`).
- **Score $< 0.50$ & Grade $\ge$ C**: General elective credit awarded (`general_elective`).
- **Grade < C (or F)**: Articulation rejected per institutional bylaws (`rejected`).

## API Ingestion Endpoint
`POST /api/curriculum/transfer` with `rawTranscriptText` payload.
