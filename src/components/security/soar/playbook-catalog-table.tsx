'use client';

/**
 * SOAR Playbook Catalog Table
 * Sprint-040 — Playbook Management & Toggles
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SecurityPlaybook } from '@/lib/security/soar/soar-types';
import { ensureArray } from '@/lib/utils';
import { ManualTriggerDialog } from './manual-trigger-dialog';

interface PlaybookCatalogTableProps {
  playbooks: SecurityPlaybook[];
  onToggleEnabled: (id: string, enabled: boolean) => Promise<boolean>;
  onTrigger: (playbookId: string, targetType: string, targetValue: string, payload?: Record<string, any>) => Promise<boolean>;
}

export function PlaybookCatalogTable({ playbooks, onToggleEnabled, onTrigger }: PlaybookCatalogTableProps) {
  const [selectedPlaybook, setSelectedPlaybook] = useState<SecurityPlaybook | null>(null);
  const items = ensureArray<SecurityPlaybook>(playbooks);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Canonical Security Playbooks ({items.length})</CardTitle>
            <CardDescription>Automated threat containment playbooks and trigger rules</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Playbook</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Execution Mode</TableHead>
              <TableHead>Min Confidence</TableHead>
              <TableHead>Steps</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(pb => (
              <TableRow key={pb.id}>
                <TableCell>
                  <div className="font-medium text-xs sm:text-sm">{pb.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{pb.description}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{pb.category}</Badge>
                </TableCell>
                <TableCell>
                  {pb.high_impact ? (
                    <Badge variant="warning">Approval Mandated</Badge>
                  ) : pb.auto_execute ? (
                    <Badge variant="success">Autonomous</Badge>
                  ) : (
                    <Badge variant="secondary">Manual</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="info">&gt;= {pb.min_confidence}%</Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {pb.steps?.length || 0} steps
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant={pb.enabled ? 'outline' : 'secondary'}
                    onClick={() => onToggleEnabled(pb.id, !pb.enabled)}
                  >
                    {pb.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setSelectedPlaybook(pb)}
                  >
                    Run
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {selectedPlaybook && (
          <ManualTriggerDialog
            playbook={selectedPlaybook}
            open={!!selectedPlaybook}
            onClose={() => setSelectedPlaybook(null)}
            onExecute={onTrigger}
          />
        )}
      </CardContent>
    </Card>
  );
}
