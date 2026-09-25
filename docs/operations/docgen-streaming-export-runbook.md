# ExportHub Streaming Export & Large Dataset Operations Runbook

## Overview
ExportHub allows synchronous streaming and asynchronous queue processing of large datasets without exhausting Node.js heap memory.

## Formats Supported
- **CSV (`text/csv`)**: Standard RFC 4180 comma-separated values with column-level masking.
- **XLSX (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)**: Native Microsoft Excel spreadsheet stream.
- **JSON (`application/json`)**: Array of key-value records with transformed aliases.
- **HTML/PDF (`text/html`)**: Tabular print layout with CSS pagination.

## Asynchronous Queue
For datasets exceeding 5,000 records:
1. Submit background job via `POST /api/export/jobs`.
2. Job is queued and progress tracked in `export_jobs` table.
3. Upon completion, a secure 24-hour token download link is generated.
