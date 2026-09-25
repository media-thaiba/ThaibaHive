import { MerkleLineageDAG } from './merkle-lineage-dag';
import { ScientificReproducibilityPackage } from './provenance-types';

export class GrantAuditVerifier {
  /**
   * Validates a scientific reproducibility package against NSF/NIH grant integrity standards.
   */
  public static verifyPackage(dossier: ScientificReproducibilityPackage): {
    isValid: boolean;
    reproducibilityScore: number;
    auditFindings: string[];
  } {
    const findings: string[] = [];

    // 1. Verify Merkle root hash of the lineage DAG
    const nodeHashes = dossier.lineageDAG.map((n) => n.nodeHash);
    const calculatedRoot = MerkleLineageDAG.computeMerkleRoot(nodeHashes);

    if (calculatedRoot !== dossier.merkleRootHash) {
      findings.push(`Merkle DAG root mismatch: expected ${dossier.merkleRootHash}, calculated ${calculatedRoot}`);
    }

    // 2. Verify dataset manifest hash presence
    if (!dossier.dataset.manifestSha256 || dossier.dataset.manifestSha256.length < 16) {
      findings.push('Dataset manifest SHA-256 digest is missing or invalid.');
    }

    // 3. Verify container image digest
    if (!dossier.environmentDigest.containerImage) {
      findings.push('Execution container image environment digest is missing.');
    }

    // 4. Verify W3C PROV-O graph has nodes
    if (!dossier.provOJsonLd['@graph'] || dossier.provOJsonLd['@graph'].length === 0) {
      findings.push('PROV-O JSON-LD graph contains no lineage entities.');
    }

    const isValid = findings.length === 0;
    const score = isValid ? 100.0 : Math.max(0, 100 - findings.length * 25);

    return {
      isValid,
      reproducibilityScore: score,
      auditFindings: findings,
    };
  }
}
