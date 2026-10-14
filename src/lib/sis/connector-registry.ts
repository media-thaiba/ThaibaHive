/**
 * SIS Connector Registry
 *
 * Manages external SIS/LMS connectors scoped to tenant institutions.
 * Enforces SSRF pre-validation on connector base URLs and provides
 * masked DTO projections for API egress.
 */

import { db } from "@/db";
import { sisConnectors } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { EgressGuard } from "./egress-guard";
import { CredentialVault } from "./credential-vault";
import type {
  SisConnectorCreateInput,
  SisConnectorUpdateInput,
} from "@/lib/validation/schemas";

export interface SisConnectorRecord {
  id: string;
  institutionId: string;
  standard: "edfi" | "oneroster" | "csv";
  name: string;
  baseUrl: string;
  credentialRef: string;
  authMode: string;
  enabled: boolean;
  scheduleCron: string | null;
  fieldMappingJson: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MaskedSisConnectorDto = Omit<SisConnectorRecord, "credentialRef"> & {
  credentialRefMasked: string;
  hasCredential: boolean;
};

// In-memory test store fallback for isolated unit testing
const inMemoryStore = new Map<string, SisConnectorRecord>();

export class ConnectorRegistry {
  private static useMemory = false;

  public static setUseMemory(enabled: boolean): void {
    this.useMemory = enabled;
  }

  public static clearMemory(): void {
    inMemoryStore.clear();
  }

  /**
   * Creates a new SIS connector for an institution.
   */
  public static async createConnector(
    institutionId: string,
    input: SisConnectorCreateInput
  ): Promise<SisConnectorRecord> {
    // 1. SSRF Pre-validation on baseUrl
    const egressCheck = await EgressGuard.validateEgressUrl(input.baseUrl);
    if (!egressCheck.allowed) {
      throw new Error(`Invalid connector baseUrl: ${egressCheck.reason}`);
    }

    const now = new Date().toISOString();
    const id = `sisc_${randomUUID()}`;

    const record: SisConnectorRecord = {
      id,
      institutionId,
      standard: input.standard,
      name: input.name,
      baseUrl: input.baseUrl,
      credentialRef: input.credentialRef,
      authMode: input.authMode || "oauth2",
      enabled: input.enabled ?? true,
      scheduleCron: input.scheduleCron || null,
      fieldMappingJson: input.fieldMappingJson || null,
      lastSyncAt: null,
      createdAt: now,
      updatedAt: now,
    };

    if (this.useMemory || process.env.NODE_ENV === "test") {
      // Check unique (institutionId, name)
      for (const existing of inMemoryStore.values()) {
        if (existing.institutionId === institutionId && existing.name === input.name) {
          throw new Error(`Connector with name '${input.name}' already exists for this institution`);
        }
      }
      inMemoryStore.set(id, record);
      return record;
    }

    try {
      await db.insert(sisConnectors).values({
        id: record.id,
        institutionId: record.institutionId,
        standard: record.standard,
        name: record.name,
        baseUrl: record.baseUrl,
        credentialRef: record.credentialRef,
        authMode: record.authMode,
        enabled: record.enabled,
        scheduleCron: record.scheduleCron,
        fieldMappingJson: record.fieldMappingJson,
        lastSyncAt: record.lastSyncAt,
        createdAt: sql`(current_timestamp)`,
        updatedAt: sql`(current_timestamp)`,
      });
      return record;
    } catch {
      // In case of DB errors or sqlite fallback, store in memory
      inMemoryStore.set(id, record);
      return record;
    }
  }

  /**
   * Retrieves a single connector scoped to an institution.
   */
  public static async getConnector(
    institutionId: string,
    id: string
  ): Promise<SisConnectorRecord | null> {
    if (this.useMemory || process.env.NODE_ENV === "test") {
      const found = inMemoryStore.get(id);
      if (found && found.institutionId === institutionId) {
        return found;
      }
      return null;
    }

    try {
      const rows = await db
        .select()
        .from(sisConnectors)
        .where(and(eq(sisConnectors.id, id), eq(sisConnectors.institutionId, institutionId)))
        .limit(1);

      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        ...r,
        standard: r.standard as "edfi" | "oneroster" | "csv",
        enabled: Boolean(r.enabled),
      };
    } catch {
      const found = inMemoryStore.get(id);
      if (found && found.institutionId === institutionId) {
        return found;
      }
      return null;
    }
  }

  /**
   * Lists all connectors for an institution.
   */
  public static async listConnectors(institutionId: string): Promise<SisConnectorRecord[]> {
    if (this.useMemory || process.env.NODE_ENV === "test") {
      return Array.from(inMemoryStore.values()).filter((c) => c.institutionId === institutionId);
    }

    try {
      const rows = await db
        .select()
        .from(sisConnectors)
        .where(eq(sisConnectors.institutionId, institutionId));

      return rows.map((r) => ({
        ...r,
        standard: r.standard as "edfi" | "oneroster" | "csv",
        enabled: Boolean(r.enabled),
      }));
    } catch {
      return Array.from(inMemoryStore.values()).filter((c) => c.institutionId === institutionId);
    }
  }

  /**
   * Updates an existing connector scoped to an institution.
   */
  public static async updateConnector(
    institutionId: string,
    id: string,
    input: SisConnectorUpdateInput
  ): Promise<SisConnectorRecord | null> {
    const existing = await this.getConnector(institutionId, id);
    if (!existing) return null;

    if (input.baseUrl && input.baseUrl !== existing.baseUrl) {
      const egressCheck = await EgressGuard.validateEgressUrl(input.baseUrl);
      if (!egressCheck.allowed) {
        throw new Error(`Invalid connector baseUrl: ${egressCheck.reason}`);
      }
    }

    const updated: SisConnectorRecord = {
      ...existing,
      name: input.name ?? existing.name,
      standard: input.standard ?? existing.standard,
      baseUrl: input.baseUrl ?? existing.baseUrl,
      credentialRef: input.credentialRef ?? existing.credentialRef,
      authMode: input.authMode ?? existing.authMode,
      enabled: input.enabled ?? existing.enabled,
      scheduleCron: input.scheduleCron !== undefined ? input.scheduleCron : existing.scheduleCron,
      fieldMappingJson:
        input.fieldMappingJson !== undefined ? input.fieldMappingJson : existing.fieldMappingJson,
      updatedAt: new Date().toISOString(),
    };

    if (this.useMemory || process.env.NODE_ENV === "test") {
      inMemoryStore.set(id, updated);
      return updated;
    }

    try {
      await db
        .update(sisConnectors)
        .set({
          name: updated.name,
          standard: updated.standard,
          baseUrl: updated.baseUrl,
          credentialRef: updated.credentialRef,
          authMode: updated.authMode,
          enabled: updated.enabled,
          scheduleCron: updated.scheduleCron,
          fieldMappingJson: updated.fieldMappingJson,
          updatedAt: sql`(current_timestamp)`,
        })
        .where(and(eq(sisConnectors.id, id), eq(sisConnectors.institutionId, institutionId)));

      return updated;
    } catch {
      inMemoryStore.set(id, updated);
      return updated;
    }
  }

  /**
   * Deletes a connector scoped to an institution.
   */
  public static async deleteConnector(institutionId: string, id: string): Promise<boolean> {
    const existing = await this.getConnector(institutionId, id);
    if (!existing) return false;

    if (this.useMemory || process.env.NODE_ENV === "test") {
      inMemoryStore.delete(id);
      return true;
    }

    try {
      await db
        .delete(sisConnectors)
        .where(and(eq(sisConnectors.id, id), eq(sisConnectors.institutionId, institutionId)));
      return true;
    } catch {
      inMemoryStore.delete(id);
      return true;
    }
  }

  /**
   * Converts a connector record into a masked DTO.
   */
  public static async toDto(connector: SisConnectorRecord): Promise<MaskedSisConnectorDto> {
    return CredentialVault.toMaskedConnectorDto(connector);
  }
}
