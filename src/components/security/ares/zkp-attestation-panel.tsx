/**
 * Zero-Knowledge Compliance Attestation Panel
 * Sprint-042 (ARES) — ARES-022
 */

'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ZkpAttestationPanel() {
  const [merkleRoot, setMerkleRoot] = useState('a6b4e99f0123456789abcdef0123456789abcdef0123456789abcdef01234567');
  const [auditPayload, setAuditPayload] = useState('{"tenantId":"tenant-primary","event":"POLICY_VERIFIED"}');
  const [proofResult, setProofResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateProof = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/security/predictive-resilience/zkp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merkleRoot,
          auditRecordPreimage: auditPayload,
          tenantId: 'tenant-master',
        }),
      });
      const data = await res.json();
      setProofResult(data.proof);
    } catch (err) {
      console.error('Failed to generate proof:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Zero-Knowledge Proof (ZKP) Audit Attestation</h2>
        <p className="text-sm text-muted-foreground">
          Cryptographic zk-SNARK verification of Merkle audit trail integrity with zero sensitive data disclosure
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Generate Zero-Knowledge Audit Proof</CardTitle>
          <CardDescription className="text-xs">
            Produces Groth16 zk-SNARK proof verifying that a record belongs to the official Merkle root
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium">Merkle Root</label>
            <Input value={merkleRoot} onChange={(e) => setMerkleRoot(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">Audit Record Preimage (Private Witness)</label>
            <Input value={auditPayload} onChange={(e) => setAuditPayload(e.target.value)} />
          </div>
          <Button onClick={handleGenerateProof} disabled={loading} size="sm">
            {loading ? 'Generating Proof (BN128)...' : 'Generate zk-SNARK Proof'}
          </Button>

          {proofResult && (
            <div className="mt-4 p-3 bg-muted/40 rounded-lg space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Proof ID: {proofResult.proofId}</span>
                <Badge variant="success">zk-SNARK Groth16 (BN128)</Badge>
              </div>
              <p className="text-muted-foreground font-mono truncate">
                Leaf Commitment: {proofResult.leafHashCommitment}
              </p>
              <p className="text-muted-foreground font-mono truncate">
                Public Inputs: [{proofResult.publicInputs?.join(', ')}]
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
