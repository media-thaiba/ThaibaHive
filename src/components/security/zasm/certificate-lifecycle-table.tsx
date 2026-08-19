'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { RefreshCw, Ban } from 'lucide-react';

interface CertTableProps {
  certificates: any[];
  onRotate: (serviceName: string) => Promise<void>;
  onRevoke: (serialNumber: string, reason: string) => Promise<void>;
}

export function CertificateLifecycleTable({ certificates, onRotate, onRevoke }: CertTableProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleRotate = async (serviceName: string) => {
    setLoadingAction(`rot-${serviceName}`);
    try {
      await onRotate(serviceName);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRevoke = async (serialNumber: string) => {
    setLoadingAction(`rev-${serialNumber}`);
    try {
      await onRevoke(serialNumber, 'KEY_COMPROMISE');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Serial Number</TableHead>
            <TableHead>Service / Common Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Valid Until</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {certificates.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                No active X.509 certificates found.
              </TableCell>
            </TableRow>
          ) : (
            certificates.map((c) => {
              const commonName = c.subject?.commonName || c.serviceName || 'unknown-service';
              const isRevoked = !!c.isRevoked;

              return (
                <TableRow key={c.serialNumber}>
                  <TableCell className="font-mono text-xs">{c.serialNumber}</TableCell>
                  <TableCell className="font-medium text-sm">{commonName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.type || 'SERVICE_CERT'}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.validTo ? new Date(c.validTo).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {isRevoked ? (
                      <Badge variant="destructive">Revoked</Badge>
                    ) : (
                      <Badge variant="success">Valid</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {!isRevoked && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loadingAction === `rot-${c.serviceName || commonName}`}
                          onClick={() => handleRotate(c.serviceName || commonName)}
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          Rotate
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={loadingAction === `rev-${c.serialNumber}`}
                          onClick={() => handleRevoke(c.serialNumber)}
                        >
                          <Ban className="h-3.5 w-3.5 mr-1" />
                          Revoke
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
