'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';

interface PolicyTableProps {
  policies: any[];
}

export function SegmentationPolicyTable({ policies }: PolicyTableProps) {
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ALLOW':
        return <Badge variant="success">Allow</Badge>;
      case 'DENY':
        return <Badge variant="destructive">Deny</Badge>;
      case 'QUARANTINE':
        return <Badge variant="warning">Quarantine</Badge>;
      case 'STEP_UP_AUTH':
        return <Badge variant="info">Step-Up Auth</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Priority</TableHead>
            <TableHead>Policy Name</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target Trust Tiers</TableHead>
            <TableHead>VLAN Steering</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {policies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                No micro-segmentation policies defined.
              </TableCell>
            </TableRow>
          ) : (
            policies.map((p) => {
              const tiers = Array.isArray(p.targetTrustTiers)
                ? p.targetTrustTiers
                : typeof p.targetTrustTiers === 'string'
                ? JSON.parse(p.targetTrustTiers || '[]')
                : [];

              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono font-bold text-sm">{p.priority}</TableCell>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                  </TableCell>
                  <TableCell>{getActionBadge(p.action)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {tiers.map((t: string) => (
                        <Badge key={t} variant="outline" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.vlanTag ? (
                      <Badge variant="info">VLAN {p.vlanTag}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Default</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.enabled !== false ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Disabled</Badge>
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
