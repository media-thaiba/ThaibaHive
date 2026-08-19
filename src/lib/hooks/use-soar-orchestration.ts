'use client';

/**
 * SOAR Security Orchestration React Hook
 * Sprint-040 — Unified Client State Management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SecurityPlaybook, SoarExecutionContext, SoarApprovalItem } from '@/lib/security/soar/soar-types';
import { fetchWithDPoP } from '@/lib/api-client';
import { toast } from 'sonner';

export interface SoarOrchestrationState {
  playbooks: SecurityPlaybook[];
  activeExecutions: SoarExecutionContext[];
  executionHistory: SoarExecutionContext[];
  pendingApprovals: SoarApprovalItem[];
  metrics: {
    totalExecutions: number;
    totalActions: number;
    pendingApprovals: number;
    totalCompensations: number;
    avgExecutionDurationSeconds: number;
    engineEnabled: boolean;
  };
  loading: boolean;
  error: string | null;
  triggerPlaybook: (playbookId: string, targetType: string, targetValue: string, payload?: Record<string, any>) => Promise<boolean>;
  resolveApproval: (id: string, decision: 'APPROVED' | 'REJECTED', reason?: string) => Promise<boolean>;
  toggleKillswitch: (enabled: boolean) => Promise<boolean>;
  togglePlaybookEnabled: (id: string, enabled: boolean) => Promise<boolean>;
  refresh: () => void;
}

export function useSoarOrchestration(): SoarOrchestrationState {
  const [playbooks, setPlaybooks] = useState<SecurityPlaybook[]>([]);
  const [activeExecutions, setActiveExecutions] = useState<SoarExecutionContext[]>([]);
  const [executionHistory, setExecutionHistory] = useState<SoarExecutionContext[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<SoarApprovalItem[]>([]);
  const [metrics, setMetrics] = useState({
    totalExecutions: 0,
    totalActions: 0,
    pendingApprovals: 0,
    totalCompensations: 0,
    avgExecutionDurationSeconds: 0,
    engineEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeCountRef = useRef(0);

  useEffect(() => {
    activeCountRef.current = activeExecutions.length;
  }, [activeExecutions.length]);

  const fetchSoarData = useCallback(async () => {
    try {
      const [pbRes, execRes, apprRes, metricsRes] = await Promise.all([
        fetchWithDPoP('/api/admin/security/soar/playbooks'),
        fetchWithDPoP('/api/admin/security/soar/executions'),
        fetchWithDPoP('/api/admin/security/soar/approvals'),
        fetchWithDPoP('/api/admin/security/soar/metrics'),
      ]);

      if (pbRes.ok) {
        const data = await pbRes.json();
        setPlaybooks(data.playbooks || []);
      }
      if (execRes.ok) {
        const data = await execRes.json();
        setActiveExecutions(data.active || []);
        setExecutionHistory(data.history || []);
      }
      if (apprRes.ok) {
        const data = await apprRes.json();
        setPendingApprovals(data.approvals || []);
      }
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(prev => data.metrics || prev);
      }

      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load SOAR dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSoarData().catch(() => {});
    
    // Adaptive polling: 3s when active executions exist, 10s when idle
    let timer: NodeJS.Timeout;
    const scheduleNext = () => {
      const interval = activeCountRef.current > 0 ? 3000 : 10000;
      timer = setTimeout(() => {
        fetchSoarData()
          .catch(() => {})
          .finally(() => scheduleNext());
      }, interval);
    };

    scheduleNext();
    return () => clearTimeout(timer);
  }, [fetchSoarData]);

  const triggerPlaybook = async (
    playbookId: string,
    targetType: string,
    targetValue: string,
    payload: Record<string, any> = {}
  ): Promise<boolean> => {
    try {
      const res = await fetchWithDPoP('/api/admin/security/soar/executions/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playbook_id: playbookId,
          target_type: targetType,
          target_value: targetValue,
          payload,
        }),
      });
      if (res.ok) {
        toast.success(`Playbook dispatched successfully for target ${targetValue}`);
        fetchSoarData().catch(() => {});
        return true;
      }
      toast.error('Failed to dispatch playbook execution');
      return false;
    } catch {
      toast.error('Network error triggering playbook execution');
      return false;
    }
  };

  const resolveApproval = async (
    id: string,
    decision: 'APPROVED' | 'REJECTED',
    reason?: string
  ): Promise<boolean> => {
    try {
      const res = await fetchWithDPoP(`/api/admin/security/soar/approvals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason }),
      });
      if (res.ok) {
        toast.success(`Security mitigation approval ${decision.toLowerCase()} successfully`);
        fetchSoarData().catch(() => {});
        return true;
      }
      toast.error('Failed to resolve approval item');
      return false;
    } catch {
      toast.error('Network error resolving approval');
      return false;
    }
  };

  const toggleKillswitch = async (enabled: boolean): Promise<boolean> => {
    try {
      const res = await fetchWithDPoP('/api/admin/security/soar/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        toast.success(`SOAR engine state updated: ${enabled ? 'ACTIVE' : 'KILLSWITCH ENGAGED'}`);
        fetchSoarData().catch(() => {});
        return true;
      }
      toast.error('Failed to update emergency killswitch');
      return false;
    } catch {
      toast.error('Network error updating killswitch');
      return false;
    }
  };

  const togglePlaybookEnabled = async (id: string, enabled: boolean): Promise<boolean> => {
    try {
      const res = await fetchWithDPoP(`/api/admin/security/soar/playbooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        toast.success(`Playbook status updated to ${enabled ? 'Enabled' : 'Disabled'}`);
        fetchSoarData().catch(() => {});
        return true;
      }
      toast.error('Failed to toggle playbook status');
      return false;
    } catch {
      toast.error('Network error updating playbook');
      return false;
    }
  };

  return {
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
    refresh: fetchSoarData,
  };
}
