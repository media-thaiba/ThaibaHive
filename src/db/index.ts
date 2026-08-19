// Re-export from @thaiba/db package for backward compatibility
export {
  db,
  isPostgres,
  replicaRouter,
  getReadDb,
  getWriteDb,
  tenantRouter,
  getTenantDb,
  TenantRouter,
  TenantIsolationError,
} from "@thaiba/db";
export type { TenantRegion, TenantRoutingConfig } from "@thaiba/db";
export * from "@thaiba/db/schema";
export * from "@thaiba/db/replica-router";
export * from "@thaiba/db/tenant-router";
export * from "drizzle-orm";
