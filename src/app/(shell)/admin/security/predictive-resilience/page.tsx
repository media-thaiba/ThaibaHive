/**
 * Admin Predictive Security & Chaos Resilience Radar UI
 * Sprint-042 (ARES) — ARES-022
 */

'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { usePredictiveThreats } from '@/lib/hooks/use-predictive-threats';
import { useChaosMesh } from '@/lib/hooks/use-chaos-mesh';
import { useThreatGraph } from '@/lib/hooks/use-threat-graph';
import { useResilienceScore } from '@/lib/hooks/use-resilience-score';
import { PredictiveThreatRadar } from '@/components/security/ares/predictive-threat-radar';
import { ChaosExperimentRunner } from '@/components/security/ares/chaos-experiment-runner';
import { ChaosKillSwitchDialog } from '@/components/security/ares/chaos-kill-switch-dialog';
import { ZkpAttestationPanel } from '@/components/security/ares/zkp-attestation-panel';
import { ThreatIntelligenceGraphViewer } from '@/components/security/ares/threat-intelligence-graph-viewer';
import { ResilienceScoreMatrix } from '@/components/security/ares/resilience-score-matrix';
import { RemediationAdvisorCard } from '@/components/security/ares/remediation-advisor-card';

export default function PredictiveResilienceRadarPage() {
  const { threats, loading: threatsLoading, triggerForecast } = usePredictiveThreats();
  const {
    scenarios,
    executions,
    isRunning: chaosRunning,
    loading: chaosLoading,
    runExperiment,
    emergencyAbort,
  } = useChaosMesh();
  const { nodes, edges, overview, loading: graphLoading } = useThreatGraph();
  const { snapshot, recommendations, loading: scoreLoading } = useResilienceScore();

  const [killSwitchOpen, setKillSwitchOpen] = useState(false);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Predictive Security &amp; Chaos Resilience Radar (ARES)
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bayesian threat forecasting, automated continuous chaos simulation, and zero-knowledge compliance verification
        </p>
      </div>

      <Tabs defaultValue="threats" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="threats">Predictive Radar</TabsTrigger>
          <TabsTrigger value="chaos">Chaos Mesh</TabsTrigger>
          <TabsTrigger value="graph">Threat Graph</TabsTrigger>
          <TabsTrigger value="zkp">ZKP Attestation</TabsTrigger>
          <TabsTrigger value="resilience">Resilience Score</TabsTrigger>
        </TabsList>

        <TabsContent value="threats">
          <PredictiveThreatRadar
            threats={threats}
            loading={threatsLoading}
            onTriggerForecast={() => triggerForecast('CREDENTIAL_STUFFING')}
          />
        </TabsContent>

        <TabsContent value="chaos">
          <ChaosExperimentRunner
            scenarios={scenarios}
            executions={executions}
            isRunning={chaosRunning}
            loading={chaosLoading}
            onRunScenario={(id) => runExperiment(id)}
            onOpenKillSwitch={() => setKillSwitchOpen(true)}
          />
        </TabsContent>

        <TabsContent value="graph">
          <ThreatIntelligenceGraphViewer
            nodes={nodes}
            edges={edges}
            overview={overview}
            loading={graphLoading}
          />
        </TabsContent>

        <TabsContent value="zkp">
          <ZkpAttestationPanel />
        </TabsContent>

        <TabsContent value="resilience" className="space-y-6">
          <ResilienceScoreMatrix snapshot={snapshot} loading={scoreLoading} />
          <RemediationAdvisorCard recommendations={recommendations} />
        </TabsContent>
      </Tabs>

      <ChaosKillSwitchDialog
        open={killSwitchOpen}
        onOpenChange={setKillSwitchOpen}
        onConfirmAbort={async (reason) => {
          await emergencyAbort(reason);
        }}
      />
    </div>
  );
}
