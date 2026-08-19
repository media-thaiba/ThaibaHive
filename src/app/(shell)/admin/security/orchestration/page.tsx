'use client';

/**
 * Autonomous Security Orchestration & Real-Time Threat Response (SOAR) Dashboard
 * Sprint-040 — Administrative Control Center & Automation Radar
 */

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { useSoarOrchestration } from '@/lib/hooks/use-soar-orchestration';
import { SoarMetricsOverview } from '@/components/security/soar/soar-metrics-overview';
import { EmergencyKillswitchCard } from '@/components/security/soar/emergency-killswitch-card';
import { PendingApprovalsCard } from '@/components/security/soar/pending-approvals-card';
import { ActiveExecutionsTable } from '@/components/security/soar/active-executions-table';
import { PlaybookCatalogTable } from '@/components/security/soar/playbook-catalog-table';

export default function SoarOrchestrationPage() {
  const {
    playbooks,
    activeExecutions,
    executionHistory,
    pendingApprovals,
    metrics,
    loading,
    error,
    triggerPlaybook,
    resolveApproval,
    toggleKillswitch,
    togglePlaybookEnabled,
    refresh,
  } = useSoarOrchestration();

  const allExecutions = [...activeExecutions, ...executionHistory];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Autonomous Security Orchestration & Response (SOAR)"
          description="Autonomous threat response, multi-step playbooks, SAGA rollbacks, and human-in-the-loop review"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh Radar'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          <div>
            <div className="font-semibold">Telemetry Error</div>
            <div>{error}</div>
          </div>
        </Alert>
      )}

      {/* 1. Metrics Overview */}
      <SoarMetricsOverview metrics={metrics} loading={loading} />

      {/* 2. Emergency Killswitch & Status */}
      <EmergencyKillswitchCard
        engineEnabled={metrics.engineEnabled}
        onToggle={toggleKillswitch}
      />

      {/* 3. Pending Approvals Queue (High Priority) */}
      <PendingApprovalsCard
        approvals={pendingApprovals}
        onResolve={resolveApproval}
      />

      {/* 4. Live Execution Feed */}
      <ActiveExecutionsTable
        executions={allExecutions}
        loading={loading}
      />

      {/* 5. Playbook Catalog & Actions */}
      <PlaybookCatalogTable
        playbooks={playbooks}
        onToggleEnabled={togglePlaybookEnabled}
        onTrigger={triggerPlaybook}
      />
    </div>
  );
}
