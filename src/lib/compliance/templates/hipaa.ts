import { ComplianceTemplate } from "./soc2";

export const HIPAA_TEMPLATE: ComplianceTemplate = {
  standard: "HIPAA",
  title: "HIPAA Security & Privacy Rule Compliance Evidence Dossier",
  version: "2026.1",
  controls: [
    {
      id: "164.312(b)",
      name: "Audit Controls & Cryptographic Chaining",
      description: "Hardware/software mechanisms recording and examining activity in systems containing ePHI.",
      status: "COMPLIANT",
      evidenceKeys: ["merkleRoots", "auditChainVerification"],
    },
    {
      id: "164.312(c)",
      name: "Integrity Controls & Non-Repudiation",
      description: "SHA-256 Merkle root verification ensuring ePHI has not been altered or destroyed in an unauthorized manner.",
      status: "COMPLIANT",
      evidenceKeys: ["merkleRoots", "forensicSnapshots"],
    },
    {
      id: "164.308(a)(1)",
      name: "Security Management Process & Threat Telemetry",
      description: "Procedures for identifying and responding to suspected or known security incidents in real time.",
      status: "COMPLIANT",
      evidenceKeys: ["activeRules", "violationHistory"],
    },
  ],
};
