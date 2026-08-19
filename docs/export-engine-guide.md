# Export Engine Developer & API Guide

**Module:** Core System Utilities  
**Status:** Production Ready (v1.4.0)  
**Location:** `src/app/api/export/route.ts`, `src/lib/export/`, `src/components/export-dialog.tsx`  

---

## Overview

The ThaibaHive Export Engine provides secure, high-performance data export capabilities across 7 domain areas (`attendance`, `leaves`, `staff`, `payroll`, `accounts`, `assets`, `expenses`) in 3 standardized file formats:

1. **CSV (`.csv`)** — Standard RFC 4180 comma-separated values with UTF-8 Byte Order Mark (`\uFEFF`) for Excel compatibility.
2. **Excel (`.xlsx`)** — Formatted spreadsheets generated via `exceljs` featuring styled header rows, auto-sized column widths, currency formatting, and zebra striping.
3. **PDF (`.pdf`)** — Audit-ready document layouts generated via `pdfkit` featuring institutional banner headers, metadata summaries, multi-page table overflow handling, and page numbering.

---

## Security & Defense Mechanisms

### 1. CSV / Excel Formula Injection Prevention (DDE Mitigation)
User-controlled text fields (such as employee names, transaction notes, or descriptions) starting with formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically prepended with a single quote (`'`) to prevent execution of arbitrary external commands when opened in Microsoft Excel or LibreOffice Calc.

### 2. Domain-Granular RBAC Guarding
Access to export endpoints is guarded by domain-specific permissions with fallback to legacy `finance:export`:
- **Attendance Export:** Requires `attendance:read` or `finance:export`
- **Leave Requests Export:** Requires `leaves:read` or `finance:export`
- **Staff Directory Export:** Requires `staff:read` or `finance:export`
- **Payroll Summary Export:** Requires `reports:read` or `finance:export`
- **Accounts Export:** Requires `reports:read` or `finance:export`
- **Assets Export:** Requires `assets:read` or `finance:export`
- **Expense Claims Export:** Requires `reports:read` or `finance:export`

### 3. Multi-Tenant Institution Isolation
All database query branches enforce explicit tenant scoping (`staffInstitutions`). Callers who do not possess `super_admin` or `admin` roles cannot request data from institutions outside their assigned campus scope.

---

## API Reference

### `GET /api/export`

#### Query Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | string | **Yes** | — | Domain entity type (`attendance`, `leaves`, `staff`, `payroll`, `accounts`, `assets`, `expenses`). |
| `format` | string | No | `csv` | Target output format (`csv`, `xlsx`, `pdf`). |
| `dateFrom` | string | No | — | Filter start date (`YYYY-MM-DD`). |
| `dateTo` | string | No | — | Filter end date (`YYYY-MM-DD`). |
| `institutionId` | string | No | — | Target institution scope (UUID). |

#### Example Request
```http
GET /api/export?type=payroll&format=xlsx&dateFrom=2026-07-01&dateTo=2026-07-31 HTTP/1.1
Authorization: Bearer <jwt_token>
```

#### Example Response Headers
```http
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="payroll-export-2026-07-31.xlsx"
```

---

## Frontend Integration

### Using `<ExportButton>`

```tsx
import { ExportButton } from "@/components/export-button";

export function AttendancePageHeader() {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-bold">Attendance Records</h1>
      <ExportButton type="attendance" params={{ institutionId: "inst_123" }} />
    </div>
  );
}
```

### Using `<ExportDialog>` directly

```tsx
import { useState } from "react";
import { ExportDialog } from "@/components/export-dialog";
import { Button } from "@/components/ui/button";

export function CustomExportTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Export Report</Button>
      <ExportDialog
        open={open}
        onOpenChange={setOpen}
        type="accounts"
        title="Custom Financial Export"
      />
    </>
  );
}
```
