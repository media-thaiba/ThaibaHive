'use client';

import React, { useState, useEffect, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicDocumentVerificationPage({
  params,
}: {
  params: Promise<{ docHash: string }>;
}) {
  const { docHash } = use(params);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!docHash) return;
    setLoading(true);

    fetch(`/api/verify/${docHash}`)
      .then((res) => res.json())
      .then((data) => {
        setResult(data.result || null);
      })
      .catch((err) => {
        console.error('Public verification error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [docHash]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-lg border-2">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-2 text-2xl font-bold tracking-tight text-primary">
            ThaibaHive Institution OS
          </div>
          <CardTitle className="text-xl">Official Document Authenticity Seal</CardTitle>
          <CardDescription>Cryptographic Verification Ledger &amp; Anti-Counterfeiting Portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : !result || result.status === 'NOT_FOUND' ? (
            <div className="p-4 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-center space-y-2">
              <Badge variant="destructive" className="text-sm px-3 py-1">
                UNVERIFIED / NOT FOUND
              </Badge>
              <p className="text-xs text-red-700 dark:text-red-300">
                No authentic academic document was found matching cryptographic hash:
              </p>
              <p className="font-mono text-[11px] break-all text-muted-foreground">{docHash}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div>
                  <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    VERIFICATION STATUS
                  </div>
                  <div className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                    {result.status}
                  </div>
                </div>
                <Badge variant="default" className="bg-emerald-600">
                  OFFICIALLY SEALED
                </Badge>
              </div>

              <div className="text-sm space-y-2 border-t pt-3">
                <div><strong>Document Title:</strong> {result.title}</div>
                <div><strong>Serial Number:</strong> <span className="font-mono font-bold">{result.serialNumber}</span></div>
                <div><strong>Document Type:</strong> <span className="uppercase">{result.documentType}</span></div>
                <div><strong>Issue Date:</strong> {result.issuedAt ? new Date(result.issuedAt).toLocaleDateString() : 'Official Record'}</div>
                <div><strong>Total Public Verifications:</strong> {result.verificationCount}</div>
                <div className="pt-2">
                  <div className="text-xs text-muted-foreground">Cryptographic SHA-256 Hash:</div>
                  <div className="font-mono text-[10px] break-all bg-muted p-2 rounded mt-1">{result.documentHash}</div>
                </div>
              </div>

              <div className="text-center text-xs text-muted-foreground pt-2 border-t">
                This verification proof is tamper-evident and anchored by ThaibaHive Zero-Trust Security Mesh.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
