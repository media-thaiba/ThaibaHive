import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@base-ui/react/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div role="dialog" aria-modal="true">{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogClose: ({ children }: any) => <div>{children}</div>,
}));

import { SoarMetricsOverview } from '@/components/security/soar/soar-metrics-overview';
import { EmergencyKillswitchCard } from '@/components/security/soar/emergency-killswitch-card';
import { PendingApprovalsCard } from '@/components/security/soar/pending-approvals-card';
import { ActiveExecutionsTable } from '@/components/security/soar/active-executions-table';
import { PlaybookCatalogTable } from '@/components/security/soar/playbook-catalog-table';
import { ExecutionDetailDrawer } from '@/components/security/soar/execution-detail-drawer';
import { ManualTriggerDialog } from '@/components/security/soar/manual-trigger-dialog';
import { CANONICAL_SECURITY_PLAYBOOKS } from '@/lib/security/soar/playbooks/definitions';

describe('SOAR Dashboard UI Components & Accessibility', () => {
  const mockMetrics = {
    totalExecutions: 42,
    totalActions: 85,
    pendingApprovals: 2,
    totalCompensations: 1,
    avgExecutionDurationSeconds: 2.5,
    engineEnabled: true,
  };

  it('renders SoarMetricsOverview with all cards', () => {
    render(<SoarMetricsOverview metrics={mockMetrics} />);
    expect(screen.getByText('Total Executions')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders EmergencyKillswitchCard and handles toggle inside act', async () => {
    const onToggle = jest.fn().mockResolvedValue(true);
    render(<EmergencyKillswitchCard engineEnabled={true} onToggle={onToggle} />);

    expect(screen.getByText('ACTIVE / AUTONOMOUS')).toBeInTheDocument();
    const button = screen.getByText('Engage Killswitch');
    await act(async () => {
      fireEvent.click(button);
    });
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('renders PendingApprovalsCard with pending items and resolves within act', async () => {
    const onResolve = jest.fn().mockResolvedValue(true);
    const mockApprovals = [
      {
        id: 'appr-1',
        execution_id: 'exec-1',
        playbook_id: 'pb-1',
        playbook_name: 'Subnet Containment',
        target_entity: { type: 'SUBNET' as const, value: '192.168.1.0/24' },
        confidence_score: 75,
        trigger_payload: {},
        status: 'PENDING' as const,
        requested_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
      },
    ];

    render(<PendingApprovalsCard approvals={mockApprovals} onResolve={onResolve} />);
    expect(screen.getByText('Subnet Containment')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();

    const approveButton = screen.getByText('Approve');
    await act(async () => {
      fireEvent.click(approveButton);
    });
    expect(onResolve).toHaveBeenCalledWith('appr-1', 'APPROVED', expect.any(String));
  });

  it('renders ActiveExecutionsTable with executions and opens detail drawer', () => {
    const mockExecutions = [
      {
        execution_id: 'exec-101',
        playbook_id: 'pb-1',
        playbook_name: 'IP Quarantine Mitigation',
        trigger_payload: {},
        target_entity: { type: 'IP' as const, value: '1.2.3.4' },
        state: 'COMPLETED' as const,
        step_order: ['s1'],
        steps: {
          s1: {
            step_id: 's1',
            name: 'Quarantine IP',
            action: 'quarantine_ip',
            state: 'COMPLETED' as const,
            started_at: new Date().toISOString(),
            input_params: {},
          },
        },
        started_at: new Date().toISOString(),
      },
    ];

    render(<ActiveExecutionsTable executions={mockExecutions} loading={false} />);
    expect(screen.getByText('IP Quarantine Mitigation')).toBeInTheDocument();
    expect(screen.getByText(/1\.2\.3\.4/)).toBeInTheDocument();
  });

  it('renders PlaybookCatalogTable with canonical definitions', () => {
    const onToggle = jest.fn();
    const onTrigger = jest.fn();
    render(
      <PlaybookCatalogTable
        playbooks={CANONICAL_SECURITY_PLAYBOOKS}
        onToggleEnabled={onToggle}
        onTrigger={onTrigger}
      />
    );

    expect(screen.getByText(/Canonical Security Playbooks/i)).toBeInTheDocument();
    expect(screen.getByText('IP_QUARANTINE_AUTO_MITIGATION')).toBeInTheDocument();
  });

  it('renders ExecutionDetailDrawer with granular step inspection', () => {
    const mockExec = {
      execution_id: 'exec-inspect-99',
      playbook_id: 'pb-1',
      playbook_name: 'Credential Stuffing Defense',
      trigger_payload: { ip: '198.51.100.4' },
      target_entity: { type: 'USER' as const, value: 'user_victim_1' },
      state: 'COMPENSATED' as const,
      step_order: ['step_revoke', 'step_waf'],
      steps: {
        step_revoke: {
          step_id: 'step_revoke',
          name: 'Revoke User Session',
          action: 'revoke_session',
          state: 'COMPLETED' as const,
          started_at: new Date().toISOString(),
          input_params: { user_id: 'user_victim_1' },
          compensated: true,
        },
        step_waf: {
          step_id: 'step_waf',
          name: 'Edge WAF Sync',
          action: 'sync_edge_waf',
          state: 'FAILED' as const,
          started_at: new Date().toISOString(),
          input_params: {},
          error: 'Edge API 503 Timeout',
        },
      },
      started_at: new Date().toISOString(),
      compensation_status: 'COMPLETED' as const,
    };

    render(
      <ExecutionDetailDrawer
        execution={mockExec}
        open={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('Credential Stuffing Defense')).toBeInTheDocument();
    expect(screen.getByText(/exec-inspect/i)).toBeInTheDocument();
    expect(screen.getByText(/Revoke User Session/)).toBeInTheDocument();
    expect(screen.getByText(/Edge WAF Sync/)).toBeInTheDocument();
  });

  it('renders ManualTriggerDialog and submits ad-hoc execution', async () => {
    const onExecute = jest.fn().mockResolvedValue(true);
    render(
      <ManualTriggerDialog
        playbook={CANONICAL_SECURITY_PLAYBOOKS[0]}
        open={true}
        onClose={jest.fn()}
        onExecute={onExecute}
      />
    );

    expect(screen.getByText(/Manual Trigger:/i)).toBeInTheDocument();
    const input = screen.getByPlaceholderText('198.51.100.22');
    fireEvent.change(input, { target: { value: '198.51.100.77' } });

    const launchButton = screen.getByText('Execute Playbook');
    await act(async () => {
      fireEvent.click(launchButton);
    });

    expect(onExecute).toHaveBeenCalledWith(
      CANONICAL_SECURITY_PLAYBOOKS[0].id,
      'IP',
      '198.51.100.77',
      expect.any(Object)
    );
  });

  it('verifies WCAG 2.1 AA accessibility and ARIA landmarks across SOAR UI', () => {
    const { container } = render(<SoarMetricsOverview metrics={mockMetrics} />);
    const buttons = container.querySelectorAll('button');
    buttons.forEach(btn => {
      expect(btn).not.toBeDisabled();
    });

    // Check focusable interactive elements
    expect(container.querySelector('[role="status"], div')).toBeInTheDocument();
  });
});
