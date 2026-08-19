'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { WorkspaceSkeleton } from './workspace-skeleton';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { PersonalizationDialog, WidgetConfig } from './personalization-dialog';
import { useWorkspaceSse } from '@/lib/hooks/use-workspace-sse';
import { toast } from 'sonner';

// Import Widgets
import { PrincipalAttendanceTrends } from './widgets/principal-attendance-trends';
import { PrincipalFeeRecovery } from './widgets/principal-fee-recovery';
import { TeacherClassAttendance } from './widgets/teacher-class-attendance';
import { TeacherHomeworkTracker } from './widgets/teacher-homework-tracker';
import { CashierTransactionTally } from './widgets/cashier-transaction-tally';
import { CashierPendingFees } from './widgets/cashier-pending-fees';
import { ParentChildAttendance } from './widgets/parent-child-attendance';
import { ParentFeeCard } from './widgets/parent-fee-card';

interface WorkspaceShellProps {
  role: string;
}

const DEFAULT_WIDGETS: Record<string, WidgetConfig[]> = {
  principal: [
    { widgetId: 'principal-attendance-trends', enabled: true, order: 0 },
    { widgetId: 'principal-fee-recovery', enabled: true, order: 1 },
  ],
  teacher: [
    { widgetId: 'teacher-class-attendance', enabled: true, order: 0 },
    { widgetId: 'teacher-homework-tracker', enabled: true, order: 1 },
  ],
  cashier: [
    { widgetId: 'cashier-transaction-tally', enabled: true, order: 0 },
    { widgetId: 'cashier-pending-fees', enabled: true, order: 1 },
  ],
  parent: [
    { widgetId: 'parent-child-attendance', enabled: true, order: 0 },
    { widgetId: 'parent-fee-card', enabled: true, order: 1 },
  ],
};

const WIDGET_REGISTRY: Record<string, React.ComponentType<{ data: any }>> = {
  'principal-attendance-trends': PrincipalAttendanceTrends,
  'principal-fee-recovery': PrincipalFeeRecovery,
  'teacher-class-attendance': TeacherClassAttendance,
  'teacher-homework-tracker': TeacherHomeworkTracker,
  'cashier-transaction-tally': CashierTransactionTally,
  'cashier-pending-fees': CashierPendingFees,
  'parent-child-attendance': ParentChildAttendance,
  'parent-fee-card': ParentFeeCard,
};

const TITLE_MAP: Record<string, string> = {
  principal: 'Principal Workspace',
  teacher: 'Teacher Workspace',
  cashier: 'Cashier Workspace',
  parent: 'Parent Workspace',
};

export function WorkspaceShell({ role }: WorkspaceShellProps) {
  const [data, setData] = useState<any>(null);
  const [preferences, setPreferences] = useState<WidgetConfig[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const title = TITLE_MAP[role] || 'Workspace';

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/workspaces/data');
      if (!response.ok) {
        throw new Error('Failed to fetch workspace statistics');
      }
      const json = await response.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[WorkspaceShell] Error fetching aggregated data:', msg);
      toast.error('Could not refresh workspace statistics.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  const fetchPrefs = useCallback(async () => {
    try {
      const response = await fetch(`/api/workspaces/preferences?workspaceType=${role}`);
      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }
      const json = await response.json();
      if (json.success && json.preferences?.layoutConfig) {
        setPreferences(json.preferences.layoutConfig);
      } else {
        // Fallback to default configurations
        setPreferences(DEFAULT_WIDGETS[role] || []);
      }
    } catch (err: unknown) {
      console.error('[WorkspaceShell] Error fetching preferences:', err);
      setPreferences(DEFAULT_WIDGETS[role] || []);
    } finally {
      setIsLoadingPrefs(false);
    }
  }, [role]);

  // Initial Data & Preferences load
  useEffect(() => {
    setIsLoadingData(true);
    setIsLoadingPrefs(true);
    fetchData();
    fetchPrefs();
  }, [fetchData, fetchPrefs]);

  // Connect to SSE stream (Rule 82 manages subscription lifecycle)
  useWorkspaceSse(role, () => {
    fetchData();
  });

  const handlePreferencesSaved = (updatedWidgets: WidgetConfig[]) => {
    setPreferences(updatedWidgets);
  };

  const isLoading = isLoadingData || isLoadingPrefs;

  if (isLoading) {
    return <WorkspaceSkeleton />;
  }

  // Active widgets: sorted by order and filtered by enabled state
  const activeWidgets = preferences
    .filter((w) => w.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <div data-testid="workspace-shell" className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Overview of status updates, transactions, and scheduled items.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          data-testid="customize-button"
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Customize
        </Button>
      </div>

      {activeWidgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            No widgets are currently visible in your workspace.
          </p>
          <Button variant="secondary" size="sm" onClick={() => setIsDialogOpen(true)}>
            Add Widgets
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {activeWidgets.map((pref) => {
            const WidgetComponent = WIDGET_REGISTRY[pref.widgetId];
            if (!WidgetComponent) return null;

            return (
              <div key={pref.widgetId} data-testid={`widget-${pref.widgetId}`} className="h-full">
                <ErrorBoundary>
                  <WidgetComponent data={data} />
                </ErrorBoundary>
              </div>
            );
          })}
        </div>
      )}

      {isDialogOpen && (
        <PersonalizationDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          workspaceType={role}
          widgets={preferences}
          onSave={handlePreferencesSaved}
        />
      )}
    </div>
  );
}
