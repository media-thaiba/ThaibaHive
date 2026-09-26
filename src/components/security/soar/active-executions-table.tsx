'use client';

/**
 * SOAR Active & Historical Executions Table
 * Sprint-040 — Execution Audit & Radar
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SoarExecutionContext } from '@/lib/security/soar/soar-types';
import { ensureArray } from '@/lib/utils';
import { ExecutionDetailDrawer } from './execution-detail-drawer';

interface ActiveExecutionsTableProps {
  executions: SoarExecutionContext[];
  loading?: boolean;
}

export function ActiveExecutionsTable({ executions, loading: _loading }: ActiveExecutionsTableProps) {
  const [selectedExecution, setSelectedExecution] = useState<SoarExecutionContext | null>(null);
  const items = ensureArray<SoarExecutionContext>(executions);

  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'COMPLETED':
        return <Badge variant="success">COMPLETED</Badge>;
      case 'RUNNING':
        return <Badge variant="info">RUNNING</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">FAILED</Badge>;
      case 'COMPENSATING':
        return <Badge variant="warning">COMPENSATING</Badge>;
      case 'COMPENSATED':
        return <Badge variant="secondary">COMPENSATED</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary">CANCELLED</Badge>;
      default:
        return <Badge variant="secondary">{state}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Live Playbook Execution Feed</CardTitle>
        <CardDescription>Real-time audit log of automated and manual security responses</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No playbook executions recorded yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Playbook</TableHead>
                <TableHead>Target Entity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Started At</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(exec => {
                const totalSteps = Object.keys(exec.steps || {}).length;
                const completedSteps = Object.values(exec.steps || {}).filter(s => s.state === 'COMPLETED').length;

                return (
                  <TableRow key={exec.execution_id}>
                    <TableCell className="font-medium text-xs sm:text-sm">
                      {exec.playbook_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {exec.target_entity?.type}: {exec.target_entity?.value}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(exec.state)}</TableCell>
                    <TableCell className="text-xs">
                      {completedSteps}/{totalSteps} steps
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(exec.started_at).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedExecution(exec)}
                      >
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {selectedExecution && (
          <ExecutionDetailDrawer
            execution={selectedExecution}
            open={!!selectedExecution}
            onClose={() => setSelectedExecution(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
