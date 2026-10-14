/**
 * Ed-Fi Data Standard (v5.x) Adapter
 *
 * Pulls student, staff, and section data from an Ed-Fi ODS / API compliant endpoint.
 * Authenticates via TokenLifecycle (OAuth2 Bearer).
 */

import { TokenLifecycle } from "../token-lifecycle";
import { EgressGuard } from "../egress-guard";
import type { SisConnectorRecord } from "../connector-registry";
import type {
  SisAdapter,
  AdapterSyncOptions,
  AdapterSyncResult,
  NormalizedRecord,
} from "./types";

export class EdFiAdapter implements SisAdapter {
  public async sync(
    connector: SisConnectorRecord,
    options: AdapterSyncOptions
  ): Promise<AdapterSyncResult> {
    const token = await TokenLifecycle.getValidToken(connector);
    const baseUrl = connector.baseUrl.replace(/\/+$/, "");
    const limit = options.limit || 50;

    let fieldMappings: Record<string, string> = {};
    if (connector.fieldMappingJson) {
      try {
        fieldMappings = JSON.parse(connector.fieldMappingJson);
      } catch {
        // Fallback to empty mappings on parse error
      }
    }

    const records: NormalizedRecord[] = [];

    // Pull from students endpoint
    const students = await this.fetchEdFiResource(
      `${baseUrl}/ed-fi/students`,
      token,
      options,
      limit
    );

    for (const item of students) {
      const externalId = String(
        item.studentUniqueId || item.id || item.identificationCode || ""
      );
      if (!externalId) continue;

      const mappedPayload = this.applyFieldMappings(item, fieldMappings);
      records.push({
        entityType: "students",
        externalId,
        sourceStandard: "edfi",
        payload: {
          externalId,
          firstName: item.firstName || item.givenName,
          lastName: item.lastSurname || item.familyName,
          email: item.electronicMailAddress || item.email,
          birthDate: item.birthDate,
          ...mappedPayload,
        },
      });
    }

    // Pull from staff endpoint
    const staffs = await this.fetchEdFiResource(
      `${baseUrl}/ed-fi/staffs`,
      token,
      options,
      limit
    );

    for (const item of staffs) {
      const externalId = String(
        item.staffUniqueId || item.id || item.identificationCode || ""
      );
      if (!externalId) continue;

      const mappedPayload = this.applyFieldMappings(item, fieldMappings);
      records.push({
        entityType: "staff",
        externalId,
        sourceStandard: "edfi",
        payload: {
          externalId,
          firstName: item.firstName,
          lastName: item.lastSurname,
          email: item.electronicMailAddress || item.email,
          department: item.department,
          ...mappedPayload,
        },
      });
    }

    // Pull from sections endpoint
    const sections = await this.fetchEdFiResource(
      `${baseUrl}/ed-fi/sections`,
      token,
      options,
      limit
    );

    for (const item of sections) {
      const externalId = String(
        item.sectionIdentifier || item.id || ""
      );
      if (!externalId) continue;

      const mappedPayload = this.applyFieldMappings(item, fieldMappings);
      records.push({
        entityType: "sections",
        externalId,
        sourceStandard: "edfi",
        payload: {
          externalId,
          sectionName: item.sectionName || item.courseTitle,
          courseCode: item.courseCode,
          term: item.term,
          ...mappedPayload,
        },
      });
    }

    const nextCheckpoint = String(Date.now());

    return {
      records,
      nextCheckpoint,
      hasMore: false,
    };
  }

  private async fetchEdFiResource(
    url: string,
    token: string,
    options: AdapterSyncOptions,
    limit: number
  ): Promise<any[]> {
    const target = new URL(url);
    target.searchParams.set("limit", String(limit));

    if (options.mode === "delta" && options.checkpoint) {
      target.searchParams.set("minChangeVersion", options.checkpoint);
    }

    const urlString = target.toString();
    const egress = await EgressGuard.validateEgressUrl(urlString);
    if (!egress.allowed) {
      throw new Error(`Ed-Fi egress blocked: ${egress.reason}`);
    }

    const response = await fetch(urlString, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      // If resource endpoint returns 404, treat as empty rather than crashing
      if (response.status === 404) return [];
      const errorText = await response.text();
      throw new Error(`Ed-Fi fetch error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  private applyFieldMappings(
    raw: Record<string, any>,
    mappings: Record<string, string>
  ): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [targetKey, sourceKey] of Object.entries(mappings)) {
      if (sourceKey in raw) {
        result[targetKey] = raw[sourceKey];
      }
    }
    return result;
  }
}
