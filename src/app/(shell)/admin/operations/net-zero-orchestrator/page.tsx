'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MicrogridRadarTab } from '@/components/operations/eco/microgrid-radar-tab';
import { RenewableArbitrageTab } from '@/components/operations/eco/renewable-arbitrage-tab';
import { CarbonAccountingTab } from '@/components/operations/eco/carbon-accounting-tab';
import { EvFleetDispatchTab } from '@/components/operations/eco/ev-fleet-dispatch-tab';
import { CarbonOffsetRegistryTab } from '@/components/operations/eco/carbon-offset-registry-tab';
import { Activity, BatteryCharging, Leaf, Car, Award } from 'lucide-react';

export default function NetZeroOrchestratorCockpitPage() {
  const [activeTab, setActiveTab] = useState('microgrid');

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Autonomous Campus Microgrid &amp; Net-Zero ESG Sustainability Orchestrator
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time renewable forecasting, BESS battery arbitrage, GHG Scope 1/2/3 carbon ledger, and V2G fleet dispatcher
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="success">Microgrid: Islanding-Ready</Badge>
          <Badge variant="info">v3.33.0 ECO-MESH</Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full max-w-4xl">
          <TabsTrigger value="microgrid" className="flex items-center gap-1.5">
            <Activity className="h-4 w-4" />
            Microgrid Radar
          </TabsTrigger>
          <TabsTrigger value="arbitrage" className="flex items-center gap-1.5">
            <BatteryCharging className="h-4 w-4" />
            Arbitrage &amp; BESS
          </TabsTrigger>
          <TabsTrigger value="carbon" className="flex items-center gap-1.5">
            <Leaf className="h-4 w-4" />
            Carbon Ledger
          </TabsTrigger>
          <TabsTrigger value="ev-fleet" className="flex items-center gap-1.5">
            <Car className="h-4 w-4" />
            Smart EV &amp; V2G
          </TabsTrigger>
          <TabsTrigger value="offsets" className="flex items-center gap-1.5">
            <Award className="h-4 w-4" />
            Offset Registry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="microgrid">
          <MicrogridRadarTab />
        </TabsContent>

        <TabsContent value="arbitrage">
          <RenewableArbitrageTab />
        </TabsContent>

        <TabsContent value="carbon">
          <CarbonAccountingTab />
        </TabsContent>

        <TabsContent value="ev-fleet">
          <EvFleetDispatchTab />
        </TabsContent>

        <TabsContent value="offsets">
          <CarbonOffsetRegistryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
