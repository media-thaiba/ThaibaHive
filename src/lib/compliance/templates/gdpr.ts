import { ComplianceTemplate } from "./soc2";

export const GDPR_TEMPLATE: ComplianceTemplate = {
  standard: "GDPR",
  title: "EU General Data Protection Regulation (GDPR) Article Compliance Dossier",
  version: "2026.1",
  controls: [
    {
      id: "Art.30",
      name: "Records of Processing Activities & Data Flow Tracking",
      description: "Cryptographic logging of all personal data mutations, access, and exports.",
      status: "COMPLIANT",
      evidenceKeys: ["merkleRoots", "auditChainVerification"],
    },
    {
      id: "Art.32",
      name: "Security of Processing & Pseudonymization/Encryption",
      description: "SHA-256 data hashing, encrypted storage, and automated breach telemetry.",
      status: "COMPLIANT",
      evidenceKeys: ["activeRules", "violationHistory"],
    },
    {
      id: "Art.33",
      name: "Automated Personal Data Breach Notification Readiness",
      description: "Immediate streaming anomaly detection for unauthorized export spikes and credential misuse.",
      status: "COMPLIANT",
      evidenceKeys: ["violationHistory", "alertLog"],
    },
  ],
};
