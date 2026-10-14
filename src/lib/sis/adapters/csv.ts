/**
 * CSV SIS Adapter
 *
 * Parses CSV batches for students, staff, and sections.
 * Supports comma and semicolon delimited files.
 */

import { EgressGuard } from "../egress-guard";
import type { SisConnectorRecord } from "../connector-registry";
import type {
  SisAdapter,
  AdapterSyncOptions,
  AdapterSyncResult,
  NormalizedRecord,
  SisEntityType,
} from "./types";

export class CsvAdapter implements SisAdapter {
  public async sync(
    connector: SisConnectorRecord,
    _options: AdapterSyncOptions
  ): Promise<AdapterSyncResult> {
    const csvContent = await this.loadCsvContent(connector);
    const records = this.parseCsv(csvContent);

    return {
      records,
      nextCheckpoint: new Date().toISOString(),
      hasMore: false,
    };
  }

  private async loadCsvContent(connector: SisConnectorRecord): Promise<string> {
    // If baseUrl is a URL, fetch content through SSRF guard
    if (connector.baseUrl.startsWith("http://") || connector.baseUrl.startsWith("https://")) {
      const egress = await EgressGuard.validateEgressUrl(connector.baseUrl);
      if (!egress.allowed) {
        throw new Error(`CSV egress blocked: ${egress.reason}`);
      }

      const res = await fetch(connector.baseUrl);
      if (!res.ok) {
        throw new Error(`CSV fetch failed with HTTP ${res.status}`);
      }
      return await res.text();
    }

    // Otherwise, check if raw CSV is stored in fieldMappingJson
    if (connector.fieldMappingJson && connector.fieldMappingJson.includes(",")) {
      return connector.fieldMappingJson;
    }

    return "";
  }

  public parseCsv(content: string): NormalizedRecord[] {
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 2) return [];

    const delimiter = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));

    const records: NormalizedRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ""));
      if (parts.length === 0 || parts.every((p) => p.length === 0)) continue;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = parts[idx] || "";
      });

      const { entityType, externalId } = this.detectEntityAndId(row);
      if (!externalId) continue;

      records.push({
        entityType,
        externalId,
        sourceStandard: "csv",
        payload: row,
      });
    }

    return records;
  }

  private detectEntityAndId(row: Record<string, string>): { entityType: SisEntityType; externalId: string } {
    // Check for student identifiers
    if (row.student_id || row.studentuniqueid || row.admission_number || row.student_number) {
      return {
        entityType: "students",
        externalId: row.student_id || row.studentuniqueid || row.admission_number || row.student_number,
      };
    }

    // Check for staff identifiers
    if (row.staff_id || row.employee_id || row.staffuniqueid || row.teacher_id) {
      return {
        entityType: "staff",
        externalId: row.staff_id || row.employee_id || row.staffuniqueid || row.teacher_id,
      };
    }

    // Check for section identifiers
    if (row.section_id || row.class_id || row.course_id || row.section_number) {
      return {
        entityType: "sections",
        externalId: row.section_id || row.class_id || row.course_id || row.section_number,
      };
    }

    // Fallback to first available ID-like column
    const idKey = Object.keys(row).find((k) => k.endsWith("id") || k === "id");
    if (idKey && row[idKey]) {
      return {
        entityType: "students",
        externalId: row[idKey],
      };
    }

    return {
      entityType: "students",
      externalId: "",
    };
  }
}
