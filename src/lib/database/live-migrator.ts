import { MigrationJob } from "./types";

export class ZeroDowntimeLiveMigrator {
  private activeJobs: Map<string, MigrationJob> = new Map();

  public startMigration(migrationId: string, tenantId: string, migrationName: string): MigrationJob {
    const job: MigrationJob = {
      id: migrationId,
      tenantId,
      migrationName,
      status: "PENDING",
      startedAt: Date.now(),
    };
    this.activeJobs.set(migrationId, job);
    return job;
  }

  public advanceToDualWrite(migrationId: string): MigrationJob {
    const job = this.activeJobs.get(migrationId);
    if (!job) throw new Error(`Migration ${migrationId} not found`);
    job.status = "DUAL_WRITING";
    return job;
  }

  public validateAndCutover(migrationId: string): MigrationJob {
    const job = this.activeJobs.get(migrationId);
    if (!job) throw new Error(`Migration ${migrationId} not found`);
    job.status = "COMPLETED";
    job.completedAt = Date.now();
    return job;
  }

  public rollbackMigration(migrationId: string, reason: string): MigrationJob {
    const job = this.activeJobs.get(migrationId);
    if (!job) throw new Error(`Migration ${migrationId} not found`);
    job.status = "ROLLED_BACK";
    job.error = reason;
    job.completedAt = Date.now();
    return job;
  }

  public getJob(migrationId: string): MigrationJob | undefined {
    return this.activeJobs.get(migrationId);
  }
}
