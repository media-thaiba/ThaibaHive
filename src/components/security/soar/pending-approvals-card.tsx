'use client';

/**
 * SOAR Pending Approvals Queue Card
 * Sprint-040 — Human-in-the-Loop Review
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SoarApprovalItem } from '@/lib/security/soar/soar-types';
import { ensureArray } from '@/lib/utils';

interface PendingApprovalsCardProps {
  approvals: SoarApprovalItem[];
  onResolve: (id: string, decision: 'APPROVED' | 'REJECTED', reason?: string) => Promise<boolean>;
}

export function PendingApprovalsCard({ approvals, onResolve }: PendingApprovalsCardProps) {
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const items = ensureArray<SoarApprovalItem>(approvals);

  const handleAction = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    setResolvingId(id);
    try {
      await onResolve(id, decision, `Manual SOC operator decision: ${decision}`);
    } finally {
      setResolvingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Human-in-the-Loop Approval Queue</CardTitle>
          <CardDescription>Actions requiring administrative review before execution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-sm text-muted-foreground">
            No pending security approvals in queue. All autonomous actions within confidence limits.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-warning/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-warning">
              Pending Security Approvals ({items.length})
            </CardTitle>
            <CardDescription>Review staged high-impact mitigations and intermediate confidence actions</CardDescription>
          </div>
          <Badge variant="warning">{items.length} Pending</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Playbook</TableHead>
              <TableHead>Target Entity</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-xs sm:text-sm">
                  {item.playbook_name}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {item.target_entity?.type}: {item.target_entity?.value}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="warning">{item.confidence_score}%</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(item.requested_at).toLocaleTimeString()}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={resolvingId === item.id}
                    onClick={() => handleAction(item.id, 'REJECTED')}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={resolvingId === item.id}
                    onClick={() => handleAction(item.id, 'APPROVED')}
                  >
                    Approve
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
