import { ComplianceTemplate } from "./soc2";

export const ISO27001_TEMPLATE: ComplianceTemplate = {
  standard: "ISO27001",
  title: "ISO/IEC 27001:2022 Information Security Management Dossier",
  version: "2026.1",
  controls: [
    {
      id: "A.9.2",
      name: "User Access Management & Authentication",
      description: "Provisioning, role isolation, and periodic access reviews for all privileged users.",
      status: "COMPLIANT",
      evidenceKeys: ["usersAndRoles", "roleMatrix"],
    },
    {
      id: "A.12.4",
      name: "Logging, Event Monitoring & Cryptographic Verification",
      description: "Cryptographically linked logging facilities and integrity protection for audit trails.",
      status: "COMPLIANT",
      evidenceKeys: ["merkleRoots", "auditChainVerification"],
    },
    {
      id: "A.12.1",
      name: "Operational Procedures & Threat Detection",
      description: "Automated telemetry and violation detection with rapid incident triage.",
      status: "COMPLIANT",
      evidenceKeys: ["activeRules", "violationHistory"],
    },
    {
      id: "A.17.1",
      name: "Information Security Continuity & Snapshot Archival",
      description: "Immutable state snapshots and cross-region recovery mechanisms.",
      status: "COMPLIANT",
      evidenceKeys: ["forensicSnapshots", "signatureManifests"],
    },
  ],
};
