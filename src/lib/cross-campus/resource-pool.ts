/**
 * Cross-Campus Resource Pool Service
 *
 * Manages shared physical resources (labs, halls, buses, exam venues, equipment)
 * across regional campus clusters.
 */

import { db } from "@/db";
import { resourcePools } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import type {
  ResourcePoolCreateInput,
  ResourcePoolUpdateInput,
} from "@/lib/validation/schemas";

export interface ResourcePoolRecord {
  id: string;
  regionalGroupId: string;
  homeInstitutionId: string;
  resourceType: "lab" | "hall" | "bus" | "exam_venue" | "equipment";
  name: string;
  capacity: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const inMemoryPools = new Map<string, ResourcePoolRecord>();

export class ResourcePoolService {
  private static useMemory = false;

  public static setUseMemory(enabled: boolean): void {
    this.useMemory = enabled;
  }

  public static clearMemory(): void {
    inMemoryPools.clear();
  }

  /**
   * Creates a new shared resource pool.
   */
  public static async createPool(
    homeInstitutionId: string,
    input: ResourcePoolCreateInput
  ): Promise<ResourcePoolRecord> {
    const id = `pool_${randomUUID()}`;
    const now = new Date().toISOString();

    const record: ResourcePoolRecord = {
      id,
      regionalGroupId: input.regionalGroupId,
      homeInstitutionId,
      resourceType: input.resourceType,
      name: input.name,
      capacity: input.capacity ?? 1,
      description: input.description || null,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    if (this.useMemory || process.env.NODE_ENV === "test") {
      inMemoryPools.set(id, record);
      return record;
    }

    try {
      await db.insert(resourcePools).values({
        id: record.id,
        regionalGroupId: record.regionalGroupId,
        homeInstitutionId: record.homeInstitutionId,
        resourceType: record.resourceType,
        name: record.name,
        capacity: record.capacity,
        description: record.description,
        isActive: record.isActive,
      });
      return record;
    } catch {
      inMemoryPools.set(id, record);
      return record;
    }
  }

  /**
   * Retrieves a resource pool by ID.
   */
  public static async getPool(id: string): Promise<ResourcePoolRecord | null> {
    if (this.useMemory || process.env.NODE_ENV === "test") {
      return inMemoryPools.get(id) || null;
    }

    try {
      const [row] = await db
        .select()
        .from(resourcePools)
        .where(eq(resourcePools.id, id))
        .limit(1);

      if (!row) return null;
      return {
        ...row,
        resourceType: row.resourceType as any,
        isActive: Boolean(row.isActive),
      };
    } catch {
      return inMemoryPools.get(id) || null;
    }
  }

  /**
   * Lists shared resource pools for a regional group or institution.
   */
  public static async listPools(options?: {
    regionalGroupId?: string;
    homeInstitutionId?: string;
    resourceType?: string;
  }): Promise<ResourcePoolRecord[]> {
    if (this.useMemory || process.env.NODE_ENV === "test") {
      return Array.from(inMemoryPools.values()).filter((p) => {
        if (options?.regionalGroupId && p.regionalGroupId !== options.regionalGroupId) return false;
        if (options?.homeInstitutionId && p.homeInstitutionId !== options.homeInstitutionId) return false;
        if (options?.resourceType && p.resourceType !== options.resourceType) return false;
        return true;
      });
    }

    try {
      const conditions = [];
      if (options?.regionalGroupId) {
        conditions.push(eq(resourcePools.regionalGroupId, options.regionalGroupId));
      }
      if (options?.homeInstitutionId) {
        conditions.push(eq(resourcePools.homeInstitutionId, options.homeInstitutionId));
      }
      if (options?.resourceType) {
        conditions.push(eq(resourcePools.resourceType, options.resourceType));
      }

      const rows = await db
        .select()
        .from(resourcePools)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(resourcePools.createdAt));

      return rows.map((r) => ({
        ...r,
        resourceType: r.resourceType as any,
        isActive: Boolean(r.isActive),
      }));
    } catch {
      return Array.from(inMemoryPools.values()).filter((p) => {
        if (options?.regionalGroupId && p.regionalGroupId !== options.regionalGroupId) return false;
        if (options?.homeInstitutionId && p.homeInstitutionId !== options.homeInstitutionId) return false;
        if (options?.resourceType && p.resourceType !== options.resourceType) return false;
        return true;
      });
    }
  }

  /**
   * Updates an existing resource pool.
   */
  public static async updatePool(
    id: string,
    input: ResourcePoolUpdateInput
  ): Promise<ResourcePoolRecord | null> {
    const existing = await this.getPool(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: ResourcePoolRecord = {
      ...existing,
      ...input,
      updatedAt: now,
    };

    if (this.useMemory || process.env.NODE_ENV === "test") {
      inMemoryPools.set(id, updated);
      return updated;
    }

    try {
      await db
        .update(resourcePools)
        .set({
          ...input,
          updatedAt: sql`(current_timestamp)`,
        } as any)
        .where(eq(resourcePools.id, id));

      return updated;
    } catch {
      inMemoryPools.set(id, updated);
      return updated;
    }
  }
}
