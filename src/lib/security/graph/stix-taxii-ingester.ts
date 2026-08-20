/**
 * Real-Time STIX/TAXII Threat Feed Ingester & Normalizer
 * Sprint-042 (ARES) — ARES-013
 */

import { randomUUID } from 'crypto';
import { Neo4jThreatGraphAdapter } from './neo4j-adapter';
import { ThreatGraphNode, ThreatGraphEdge, StixBundlePayload } from './graph-types';

export class ThreatFeedNormalizer {
  public static normalizeStixObject(stixObj: StixBundlePayload['objects'][0]): {
    node?: ThreatGraphNode;
    edge?: ThreatGraphEdge;
  } {
    const now = new Date().toISOString();

    if (stixObj.type === 'threat-actor') {
      return {
        node: {
          id: stixObj.id,
          type: 'ThreatActor',
          name: stixObj.name || 'Unknown Threat Actor',
          riskScore: 85,
          metadata: { ...stixObj },
          createdAt: stixObj.created || now,
          updatedAt: stixObj.modified || now,
        },
      };
    }

    if (stixObj.type === 'attack-pattern') {
      return {
        node: {
          id: stixObj.id,
          type: 'AttackVector',
          name: stixObj.name || 'Unknown Attack Pattern',
          riskScore: 75,
          metadata: { ...stixObj },
          createdAt: stixObj.created || now,
          updatedAt: stixObj.modified || now,
        },
      };
    }

    if (stixObj.type === 'vulnerability') {
      const cveId = stixObj.external_references?.[0]?.external_id || stixObj.name || 'CVE-UNKNOWN';
      return {
        node: {
          id: stixObj.id,
          type: 'Vulnerability_CVE',
          name: cveId,
          riskScore: 90,
          metadata: { ...stixObj },
          createdAt: stixObj.created || now,
          updatedAt: stixObj.modified || now,
        },
      };
    }

    if (stixObj.type === 'relationship') {
      const sourceId = (stixObj as any).source_ref;
      const targetId = (stixObj as any).target_ref;
      const relType = (stixObj as any).relationship_type?.toUpperCase() || 'TARGETS';

      return {
        edge: {
          id: stixObj.id || `edge-${randomUUID().slice(0, 8)}`,
          sourceId,
          targetId,
          type: relType === 'INDICATES' ? 'INDICATES' : relType === 'EXPLOITS' ? 'EXPLOITS' : 'TARGETS',
          weight: 0.8,
          metadata: { ...stixObj },
          createdAt: stixObj.created || now,
        },
      };
    }

    return {};
  }
}

export class StixTaxiiIngester {
  private static instance: StixTaxiiIngester | null = null;
  private graphAdapter: Neo4jThreatGraphAdapter;

  private constructor(graphAdapter?: Neo4jThreatGraphAdapter) {
    this.graphAdapter = graphAdapter || Neo4jThreatGraphAdapter.getInstance();
  }

  public static getInstance(graphAdapter?: Neo4jThreatGraphAdapter): StixTaxiiIngester {
    if (!StixTaxiiIngester.instance) {
      StixTaxiiIngester.instance = new StixTaxiiIngester(graphAdapter);
    }
    return StixTaxiiIngester.instance;
  }

  public async ingestBundle(bundle: StixBundlePayload): Promise<{ nodesIngested: number; edgesIngested: number }> {
    let nodesIngested = 0;
    let edgesIngested = 0;

    for (const obj of bundle.objects) {
      const { node, edge } = ThreatFeedNormalizer.normalizeStixObject(obj);
      if (node) {
        await this.graphAdapter.upsertNode(node);
        nodesIngested++;
      }
      if (edge) {
        await this.graphAdapter.upsertEdge(edge);
        edgesIngested++;
      }
    }

    return { nodesIngested, edgesIngested };
  }
}
