'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CurricularGraphTab } from '@/components/curriculum/admin/curricular-graph-tab';
import { AdvisingHubTab } from '@/components/curriculum/admin/advising-hub-tab';
import { DegreeAuditTab } from '@/components/curriculum/admin/degree-audit-tab';
import { RetentionMatrixTab } from '@/components/curriculum/admin/retention-matrix-tab';
import { TransferVaultTab } from '@/components/curriculum/admin/transfer-vault-tab';

export default function AdviseMeshAdminPage() {
  const [activeTab, setActiveTab] = useState('curricular_graph');
  const [dagData, setDagData] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [auditReport, setAuditReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/curriculum/dag?bottlenecks=true&simulate=true').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/curriculum/advising').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/curriculum/retention').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/curriculum/audit?studentId=stud_demo_1&programCode=CS_BS').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([dagRes, advRes, retRes, audRes]) => {
        if (dagRes) setDagData(dagRes);
        if (advRes?.sessions) setSessions(advRes.sessions);
        if (retRes?.alerts) setAlerts(retRes.alerts);
        if (audRes?.auditReport) setAuditReport(audRes.auditReport);
      })
      .catch(() => {
        // Safe fallback on error
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleParseOcrTranscript = async (rawText: string) => {
    const res = await fetch('/api/curriculum/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawTranscriptText: rawText }),
    });
    if (res.ok) return res.json();
    return null;
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="ADVISE-MESH / CognitiveDegree OS Cockpit"
        description="Autonomous Multi-Agent Academic Advising, Curricular DAG Optimization & Retention Intelligence"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="curricular_graph">Curricular Graph</TabsTrigger>
          <TabsTrigger value="advising_hub">Advising Hub</TabsTrigger>
          <TabsTrigger value="degree_audit">Degree Audit</TabsTrigger>
          <TabsTrigger value="retention_matrix">Retention Matrix</TabsTrigger>
          <TabsTrigger value="transfer_vault">Transfer Vault</TabsTrigger>
        </TabsList>

        <TabsContent value="curricular_graph">
          <CurricularGraphTab
            toposort={dagData?.toposort}
            bottlenecks={dagData?.bottlenecks}
            simulation={dagData?.simulation}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="advising_hub">
          <AdvisingHubTab
            sessions={sessions}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="degree_audit">
          <DegreeAuditTab
            auditReport={auditReport}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="retention_matrix">
          <RetentionMatrixTab
            alerts={alerts}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="transfer_vault">
          <TransferVaultTab
            onParseOcrTranscript={handleParseOcrTranscript}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
