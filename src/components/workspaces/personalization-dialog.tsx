'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface WidgetConfig {
  widgetId: string;
  enabled: boolean;
  order: number;
}

interface PersonalizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceType: string;
  widgets: WidgetConfig[];
  onSave: (widgets: WidgetConfig[]) => void;
}

const WIDGET_LABELS: Record<string, string> = {
  'principal-attendance-trends': 'Staff Attendance Trends',
  'principal-fee-recovery': 'Fee Recovery Summary',
  'teacher-class-attendance': 'Class Attendance',
  'teacher-homework-tracker': 'Homework Tracker',
  'cashier-transaction-tally': 'Transaction Tally',
  'cashier-pending-fees': 'Pending Fees',
  'parent-child-attendance': 'Child Attendance',
  'parent-fee-card': 'School Fee Card',
};

const WIDGET_DESCRIPTIONS: Record<string, string> = {
  'principal-attendance-trends': 'Analyze attendance patterns and metrics for school staff.',
  'principal-fee-recovery': 'Overview of school fee recovery rate and collection statistics.',
  'teacher-class-attendance': 'Check scheduled classes and submissions status.',
  'teacher-homework-tracker': 'Manage homework review pipeline and class tasks.',
  'cashier-transaction-tally': 'Tally collections and transactions processed today.',
  'cashier-pending-fees': 'Overdue invoicing and collection aging reports.',
  'parent-child-attendance': 'Track daily check-in/out and attendance history for your kids.',
  'parent-fee-card': 'View outstanding dues, invoices, and initiate online payment.',
};

export function PersonalizationDialog({
  open,
  onOpenChange,
  workspaceType,
  widgets,
  onSave,
}: PersonalizationDialogProps) {
  const [localWidgets, setLocalWidgets] = useState<WidgetConfig[]>(() => [...widgets]);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (widgetId: string) => {
    setLocalWidgets((current) =>
      current.map((w) => (w.widgetId === widgetId ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/workspaces/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceType,
          layoutConfig: localWidgets,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save layout');
      }

      onSave(localWidgets);
      toast.success('Workspace layout saved successfully!');
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || 'Failed to save layout preferences');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="personalization-dialog" className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Personalize Workspace</DialogTitle>
          <DialogDescription>
            Enable or disable widgets to customize your daily dashboard view.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {localWidgets.map((widget) => {
            const label = WIDGET_LABELS[widget.widgetId] || widget.widgetId;
            const desc = WIDGET_DESCRIPTIONS[widget.widgetId] || '';
            return (
              <div
                key={widget.widgetId}
                className="flex items-start justify-between space-x-4 rounded-lg border p-3 bg-card hover:bg-accent/10 transition-colors"
              >
                <div className="space-y-0.5">
                  <label
                    htmlFor={`toggle-${widget.widgetId}`}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {label}
                  </label>
                  {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
                </div>
                <input
                  id={`toggle-${widget.widgetId}`}
                  type="checkbox"
                  checked={widget.enabled}
                  onChange={() => handleToggle(widget.widgetId)}
                  data-testid={`widget-toggle-${widget.widgetId}`}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer mt-0.5"
                />
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Layout'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
