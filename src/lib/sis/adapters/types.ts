/**
 * SIS Standard Adapters Contract & Types
 */

import type { SisConnectorRecord } from "../connector-registry";

export type SisEntityType = "students" | "staff" | "courses" | "sections" | "enrollments";

export interface NormalizedRecord {
  entityType: SisEntityType;
  externalId: string;
  sourceStandard: "edfi" | "oneroster" | "csv";
  payload: Record<string, any>;
}

export interface AdapterSyncOptions {
  mode: "full" | "delta" | "dry_run";
  checkpoint?: string | null;
  limit?: number;
}

export interface AdapterSyncResult {
  records: NormalizedRecord[];
  nextCheckpoint: string | null;
  hasMore: boolean;
}

export interface SisAdapter {
  sync(connector: SisConnectorRecord, options: AdapterSyncOptions): Promise<AdapterSyncResult>;
}
