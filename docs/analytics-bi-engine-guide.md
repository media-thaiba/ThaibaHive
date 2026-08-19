# Workspace Analytics & Business Intelligence Engine (v3.10.0)
Operating Manual and Architectural Specifications

## Architectural Overview
The Analytics & BI Engine aggregates transaction logs and operational data across attendance, finance, and academics, materializing them into a structured database cache (`workspace_analytics_cache`) to prevent sub-second timeouts and database contention on heavy executive dashboards.

```
+-----------------------------------------------------------+
|                    Executive BI Dashboard                 |
+-----------------------------------------------------------+
                               |
                        GET /api/analytics
                               |
                               v
                     [ AnalyticsService ]
                               |
               +---------------+---------------+
               |                               |
          (Cache Hit)                     (Cache Miss)
               |                               |
               v                               v
    [ Retrieve from DB Cache ]       [ Execute Calculations ]
                                               |
                                               v
                                    [ Populate DB Cache ]
```

---

## Database Schemas

### SQLite / PostgreSQL Analytics Schemas

```sql
-- Analytics Aggregations Cache
CREATE TABLE IF NOT EXISTS `workspace_analytics_cache` (
  `id` text PRIMARY KEY NOT NULL,
  `institution_id` text NOT NULL,
  `role` text NOT NULL,
  `category` text NOT NULL,
  `payload` text NOT NULL,
  `expires_at` text NOT NULL,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);

-- Automated Report Schedules
CREATE TABLE IF NOT EXISTS `report_schedules` (
  `id` text PRIMARY KEY NOT NULL,
  `institution_id` text NOT NULL,
  `user_id` text NOT NULL,
  `title` text NOT NULL,
  `frequency` text NOT NULL,
  `format` text NOT NULL,
  `recipients` text NOT NULL,
  `is_active` integer DEFAULT 1 NOT NULL,
  `last_run_at` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  `updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);

-- Report Generation Execution History
CREATE TABLE IF NOT EXISTS `report_history` (
  `id` text PRIMARY KEY NOT NULL,
  `schedule_id` text,
  `institution_id` text NOT NULL,
  `user_id` text NOT NULL,
  `title` text NOT NULL,
  `category` text NOT NULL,
  `format` text NOT NULL,
  `file_path` text NOT NULL,
  `status` text NOT NULL,
  `error_message` text,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
```

---

## Caching Strategy & Caching Calculator Engine
- Caching is managed via `AnalyticsService.getOrCalculate()`.
- Expiry duration is set to **1 hour**.
- Aggregates are computed on demand when a cache miss occurs, and cached results are serialized to JSON string payloads under `payload` column.

---

## Web API Endpoints

### 1. Retrieve Aggregated Analytics
- **Endpoint:** `GET /api/analytics`
- **Headers:** `Authorization: Bearer <JWT>`
- **Query Params:**
  - `type`: `attendance | finance | academics | usage | predictive` (Required)
  - `startDate`: ISO String (e.g. `2026-08-01`)
  - `endDate`: ISO String (e.g. `2026-08-30`)
- **Required Permission:** `reports:read`

### 2. Custom Report Compilation (On-Demand)
- **Endpoint:** `POST /api/analytics/compile`
- **Required Permission:** `reports:read`
- **Request Body:**
  ```json
  {
    "type": "attendance",
    "format": "pdf",
    "startDate": "2026-08-01",
    "endDate": "2026-08-30"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "filePath": "/exports/attendance-export-2026-08-06.pdf"
  }
  ```

---

## Report Export Engine (PDF & Excel)
- **PDF Compilation:** Utilizes `pdfkit` to write styled PDFs containing table listings, headers, and metadata, using standard margins and A4 sizes. To bypass Windows monorepos font loading failures, Next.js server configuration uses `serverExternalPackages: ["pdfkit"]` to load default fonts.
- **Excel Compilation:** Utilizes `exceljs` configurations to construct multi-column worksheets with cell color fills and borders.
- **Storage:** Exported files are stored in `public/exports/` and are directly downloadable by client browsers.
