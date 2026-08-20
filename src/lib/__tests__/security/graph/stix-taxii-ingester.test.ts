/**
 * Unit tests for StixTaxiiIngester (ARES-013)
 */

import { StixTaxiiIngester } from '@/lib/security/graph/stix-taxii-ingester';
import { Neo4jThreatGraphAdapter } from '@/lib/security/graph/neo4j-adapter';
import { StixBundlePayload } from '@/lib/security/graph/graph-types';

describe('ARES-013: StixTaxiiIngester', () => {
  beforeEach(() => {
    Neo4jThreatGraphAdapter.resetInstance();
  });

  it('should parse and ingest STIX 2.1 bundles into graph nodes and relationships', async () => {
    const adapter = Neo4jThreatGraphAdapter.getInstance();
    const ingester = StixTaxiiIngester.getInstance(adapter);

    const mockBundle: StixBundlePayload = {
      type: 'bundle',
      id: 'bundle--1',
      objects: [
        {
          type: 'threat-actor',
          id: 'threat-actor--1',
          name: 'Lazarus Group',
          description: 'State-sponsored threat actor',
        },
        {
          type: 'vulnerability',
          id: 'vulnerability--1',
          name: 'CVE-2026-5555',
          external_references: [{ source_name: 'cve', external_id: 'CVE-2026-5555' }],
        },
        {
          type: 'relationship',
          id: 'relationship--1',
          source_ref: 'threat-actor--1',
          target_ref: 'vulnerability--1',
          relationship_type: 'exploits',
        },
      ],
    };

    const res = await ingester.ingestBundle(mockBundle);
    expect(res.nodesIngested).toBe(2);
    expect(res.edgesIngested).toBe(1);

    expect(adapter.listNodes().length).toBe(2);
    expect(adapter.listEdges().length).toBe(1);
  });
});
