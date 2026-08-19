'use client';

/**
 * SOAR Execution Detail Modal / Drawer
 * Sprint-040 — In-Depth Step Inspection
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SoarExecutionContext } from '@/lib/security/soar/soar-types';

interface ExecutionDetailDrawerProps {
  execution: SoarExecutionContext;
  open: boolean;
  onClose: () => void;
}

export function ExecutionDetailDrawer({ execution, open, onClose }: ExecutionDetailDrawerProps) {
  const steps = Object.values(execution.steps || {});

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="text-lg font-bold">{execution.playbook_name}</DialogTitle>
            <Badge variant="secondary" className="font-mono text-xs">
              {execution.execution_id.substring(0, 13)}...
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            Target: {execution.target_entity?.type} ({execution.target_entity?.value}) · Started: {new Date(execution.started_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {execution.error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
              <strong>Execution Error:</strong> {execution.error}
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Step Execution Pipeline ({steps.length} Steps)
            </h4>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div
                  key={step.step_id}
                  className="p-3 border rounded-lg bg-card/50 flex flex-col space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">
                      {idx + 1}. {step.name} <span className="text-muted-foreground">({step.action})</span>
                    </span>
                    <Badge
                      variant={
                        step.state === 'COMPLETED'
                          ? 'success'
                          : step.state === 'FAILED'
                          ? 'destructive'
                          : step.state === 'COMPENSATED'
                          ? 'secondary'
                          : 'info'
                      }
                      className="text-xs"
                    >
                      {step.state}
                    </Badge>
                  </div>
                  {step.error && (
                    <p className="text-xs text-destructive mt-1">{step.error}</p>
                  )}
                  {step.output && (
                    <pre className="text-[10px] bg-muted/60 p-2 rounded overflow-x-auto mt-1 font-mono">
                      {JSON.stringify(step.output, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
