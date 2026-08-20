'use client';

import React, { useState } from 'react';
import { SmartCampusRadar } from '@/components/operations/smart-campus-radar';
import { HvacEnergyOptimizerCard } from '@/components/operations/hvac-energy-optimizer-card';
import { FleetLogisticsMapCard } from '@/components/operations/fleet-logistics-map-card';
import { BiometricAttendancePanel } from '@/components/operations/biometric-attendance-panel';
import { CloudCostEsgCard } from '@/components/operations/cloud-cost-esg-card';
import { CrossCampusResourceGrid } from '@/components/operations/cross-campus-resource-grid';
import { MarlAgentControlDialog } from '@/components/operations/marl-agent-control-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useCampusEnergy } from '@/lib/hooks/use-campus-energy';
import { useFleetLogistics } from '@/lib/hooks/use-fleet-logistics';
import { useBiometricAttendance } from '@/lib/hooks/use-biometric-attendance';
import { useCloudSustainability } from '@/lib/hooks/use-cloud-sustainability';
import { useResourceMesh } from '@/lib/hooks/use-resource-mesh';
import { Bot, RefreshCw, Activity, Zap, Truck, Fingerprint, Share2 } from 'lucide-react';

export default function SmartCampusOperationsPage() {
  const [isControlDialogOpen, setIsControlDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const energy = useCampusEnergy();
  const fleet = useFleetLogistics();
  const biometrics = useBiometricAttendance();
  const sustainability = useCloudSustainability();
  const mesh = useResourceMesh();

  const handleEmergencyKillSwitch = async () => {
    try {
      await fetch('/api/admin/operations/marl/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'EMERGENCY_KILL_SWITCH' }),
      });
      energy.refresh();
      fleet.refresh();
    } catch {
      // Catch fetch error
    }
  };

  const handleRefreshAll = () => {
    energy.refresh();
    fleet.refresh();
    biometrics.refresh();
    sustainability.refresh();
    mesh.refresh();
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Top Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-100">
            AIMS Smart Campus Operations Radar
          </h2>
          <p className="text-sm text-slate-400">
            Multi-Agent Autonomous Resource Optimization, Zero-Trust Biometrics & ESG Intelligence
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefreshAll} className="h-9">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Telemetry
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsControlDialogOpen(true)}
            className="h-9 border-indigo-700/50 bg-indigo-950/30 text-indigo-300 hover:bg-indigo-900/40"
          >
            <Bot className="mr-2 h-4 w-4 text-indigo-400" />
            MARL Guardrails
          </Button>
        </div>
      </div>

      {/* 5-Tab Navigation Suite */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 border border-slate-800 bg-slate-950/80 p-1">
          <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span>Radar Overview</span>
          </TabsTrigger>
          <TabsTrigger value="energy" className="flex items-center gap-1.5 text-xs">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>HVAC & Energy</span>
          </TabsTrigger>
          <TabsTrigger value="fleet" className="flex items-center gap-1.5 text-xs">
            <Truck className="h-4 w-4 text-indigo-400" />
            <span>Fleet Logistics</span>
          </TabsTrigger>
          <TabsTrigger value="biometrics" className="flex items-center gap-1.5 text-xs">
            <Fingerprint className="h-4 w-4 text-teal-400" />
            <span>Edge Biometrics & ZKP</span>
          </TabsTrigger>
          <TabsTrigger value="sustainability" className="flex items-center gap-1.5 text-xs">
            <Share2 className="h-4 w-4 text-sky-400" />
            <span>Cloud ESG & Mesh</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          <SmartCampusRadar
            energySavingsKwh={energy.summary.totalSavedKwh}
            activeDispatches={fleet.activeCount}
            biometricPunches={biometrics.totalCount}
            cloudSavingsDollars={sustainability.cloudData.totalEstimatedSavingsDollars}
            renewableEnergyRatio={sustainability.carbonData.esgReport?.renewableEnergyRatioPercent || 42}
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <HvacEnergyOptimizerCard
              optimizations={energy.optimizations}
              summary={energy.summary}
              isLoading={energy.isLoading}
            />

            <FleetLogisticsMapCard
              dispatches={fleet.dispatches}
              activeCount={fleet.activeCount}
              isLoading={fleet.isLoading}
            />

            <BiometricAttendancePanel
              logs={biometrics.logs}
              totalCount={biometrics.totalCount}
              isLoading={biometrics.isLoading}
            />

            <CloudCostEsgCard
              cloudData={sustainability.cloudData}
              carbonData={sustainability.carbonData}
              isLoading={sustainability.isLoading}
            />
          </div>

          <CrossCampusResourceGrid
            resources={mesh.resources}
            recommendations={mesh.recommendations}
            isLoading={mesh.isLoading}
          />
        </TabsContent>

        {/* Tab 2: HVAC & Energy */}
        <TabsContent value="energy" className="space-y-6">
          <HvacEnergyOptimizerCard
            optimizations={energy.optimizations}
            summary={energy.summary}
            isLoading={energy.isLoading}
          />
        </TabsContent>

        {/* Tab 3: Fleet Logistics */}
        <TabsContent value="fleet" className="space-y-6">
          <FleetLogisticsMapCard
            dispatches={fleet.dispatches}
            activeCount={fleet.activeCount}
            isLoading={fleet.isLoading}
          />
        </TabsContent>

        {/* Tab 4: Edge Biometrics & ZKP */}
        <TabsContent value="biometrics" className="space-y-6">
          <BiometricAttendancePanel
            logs={biometrics.logs}
            totalCount={biometrics.totalCount}
            isLoading={biometrics.isLoading}
          />
        </TabsContent>

        {/* Tab 5: Cloud ESG & Mesh */}
        <TabsContent value="sustainability" className="space-y-6">
          <CloudCostEsgCard
            cloudData={sustainability.cloudData}
            carbonData={sustainability.carbonData}
            isLoading={sustainability.isLoading}
          />
          <CrossCampusResourceGrid
            resources={mesh.resources}
            recommendations={mesh.recommendations}
            isLoading={mesh.isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* MARL Agent Control Dialog */}
      <MarlAgentControlDialog
        isOpen={isControlDialogOpen}
        onClose={() => setIsControlDialogOpen(false)}
        onEmergencyKillSwitch={handleEmergencyKillSwitch}
      />
    </div>
  );
}
