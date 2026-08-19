export interface ComplianceTemplate {
  standard: "SOC2" | "ISO27001" | "GDPR" | "HIPAA";
  title: string;
  version: string;
  controls: Array<{
    id: string;
    name: string;
    description: string;
    status: "COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT";
    evidenceKeys: string[];
  }>;
}

export const SOC2_TEMPLATE: ComplianceTemplate = {
  standard: "SOC2",
  title: "SOC 2 Type II Compliance Evidence Dossier",
  version: "2026.1",
  controls: [
    {
      id: "CC6.1",
      name: "Logical Access Controls & Role Separation",
      description: "Enforces role-based access control (RBAC) and least privilege access across administrative accounts.",
      status: "COMPLIANT",
      evidenceKeys: ["usersAndRoles", "roleMatrix"],
    },
    {
      id: "CC6.6",
      name: "Cryptographic Tamper-Proof Audit Logging",
      description: "Maintains append-only SHA-256 Merkle tree audit logs for all administrative mutations.",
      status: "COMPLIANT",
      evidenceKeys: ["merkleRoots", "auditChainVerification"],
    },
    {
      id: "CC7.2",
      name: "Real-Time Anomaly & Security Monitoring",
      description: "Continuous streaming telemetry for privilege escalation, export spikes, and unauthorized mutations.",
      status: "COMPLIANT",
      evidenceKeys: ["activeRules", "violationHistory"],
    },
    {
      id: "CC8.1",
      name: "Forensic State Reconstruction & Change Integrity",
      description: "Cryptographically signed point-in-time state snapshots with tiered retention.",
      status: "COMPLIANT",
      evidenceKeys: ["forensicSnapshots", "signatureManifests"],
    },
  ],
};
