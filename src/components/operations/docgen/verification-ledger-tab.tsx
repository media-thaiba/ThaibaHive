'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureArray } from '@/lib/utils';

export function VerificationLedgerTab() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchHash, setSearchHash] = useState('');
  const [lookupResult, setLookupResult] = useState<any | null>(null);

  const fetchRecords = () => {
    setLoading(true);
    fetch('/api/docgen/records')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRecords(ensureArray(data.records));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch records:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleLookup = () => {
    if (!searchHash.trim()) return;

    fetch(`/api/verify/${searchHash.trim()}`)
      .then((res) => res.json())
      .then((data) => {
        setLookupResult(data.result || null);
      })
      .catch((err) => {
        console.error('Verification lookup error:', err);
      });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Public Authenticity &amp; QR Signature Verifier</CardTitle>
          <CardDescription>
            Inspect cryptographic SHA-256 signatures, verification counts, and anti-tampering proofs for any issued document.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Enter SHA-256 Document Hash or scan QR code..."
              value={searchHash}
              onChange={(e) => setSearchHash(e.target.value)}
            />
            <Button onClick={handleLookup}>Verify Hash</Button>
          </div>

          {lookupResult && (
            <div className={`p-4 rounded-md border text-sm ${lookupResult.status === 'VALID' ? 'bg-emerald-50 border-emerald-300 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200' : 'bg-red-50 border-red-300 text-red-950 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-base">Status: {lookupResult.status}</span>
                <Badge variant={lookupResult.status === 'VALID' ? 'default' : 'destructive'}>
                  {lookupResult.status}
                </Badge>
              </div>
              <div><strong>Message:</strong> {lookupResult.authenticityMessage}</div>
              {lookupResult.serialNumber && <div><strong>Serial Number:</strong> {lookupResult.serialNumber}</div>}
              {lookupResult.title && <div><strong>Title:</strong> {lookupResult.title}</div>}
              {lookupResult.issuedAt && <div><strong>Issued At:</strong> {lookupResult.issuedAt}</div>}
              <div><strong>Verification Count:</strong> {lookupResult.verificationCount}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base">Issued Document Signatures Ledger</CardTitle>
              <CardDescription>Immutable record of all official certificates, hall tickets, and transcripts</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchRecords}>
              Refresh Ledger
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No issued document records found. Generate a document from the Batch Generator tab.
            </div>
          ) : (
            <div className="border rounded-md divide-y">
              {records.map((rec) => (
                <div key={rec.id} className="p-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <span>{rec.title}</span>
                      <Badge variant={rec.status === 'valid' ? 'default' : 'destructive'}>
                        {rec.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Serial: {rec.serialNumber} | Hash: {rec.documentHash.slice(0, 16)}...
                    </div>
                  </div>
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchHash(rec.documentHash);
                        fetch(`/api/verify/${rec.documentHash}`)
                          .then((r) => r.json())
                          .then((d) => setLookupResult(d.result));
                      }}
                    >
                      Audit Proof
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
