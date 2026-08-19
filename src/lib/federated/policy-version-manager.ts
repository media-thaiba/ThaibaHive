import crypto from "crypto";

export interface PolicyVersionRecord {
  id: string;
  policyId: string;
  version: number;
  sha256Hash: string;
  contentJson: string;
  createdById: string;
  changeLog?: string;
  createdAt: string;
}

export class PolicyVersionManager {
  private versions: Map<string, PolicyVersionRecord[]> = new Map();

  public static computeSha256(content: Record<string, any>): string {
    const jsonString = JSON.stringify(content, Object.keys(content).sort());
    return crypto.createHash("sha256").update(jsonString).digest("hex");
  }

  /** Instance method alias for computeSha256 — accepts any object with a `rules` payload */
  public computeHash(policy: { rules?: Record<string, any>; [key: string]: any }): string {
    const content = policy.rules || policy;
    const jsonString = JSON.stringify(content, Object.keys(content).sort());
    return crypto.createHash("sha256").update(jsonString).digest("hex");
  }

  public createVersion(
    policyId: string,
    version: number,
    content: Record<string, any>,
    createdById: string,
    changeLog?: string
  ): PolicyVersionRecord {
    const sha256Hash = PolicyVersionManager.computeSha256(content);
    const record: PolicyVersionRecord = {
      id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      policyId,
      version,
      sha256Hash,
      contentJson: JSON.stringify(content),
      createdById,
      changeLog,
      createdAt: new Date().toISOString(),
    };

    const existing = this.versions.get(policyId) || [];
    existing.push(record);
    this.versions.set(policyId, existing);

    return record;
  }

  public getVersionHistory(policyId: string): PolicyVersionRecord[] {
    return this.versions.get(policyId) || [];
  }

  public getVersion(policyId: string, version: number): PolicyVersionRecord | null {
    const history = this.getVersionHistory(policyId);
    return history.find((v) => v.version === version) || null;
  }

  public verifyIntegrity(record: PolicyVersionRecord): boolean {
    try {
      const content = JSON.parse(record.contentJson);
      const computed = PolicyVersionManager.computeSha256(content);
      return computed === record.sha256Hash;
    } catch {
      return false;
    }
  }
}
