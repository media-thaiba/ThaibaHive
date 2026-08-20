'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DispatchRadarPanel } from '@/components/operations/engage/dispatch-radar-panel';
import { CampaignStudioPanel } from '@/components/operations/engage/campaign-studio-panel';
import { WorkflowCanvasPanel } from '@/components/operations/engage/workflow-canvas-panel';
import { ConversationalDeskPanel } from '@/components/operations/engage/conversational-desk-panel';
import { AnalyticsDashboardPanel } from '@/components/operations/engage/analytics-dashboard-panel';

export default function EngageOsPage() {
  const [activeTab, setActiveTab] = useState<string>('radar');

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Unified Multi-Modal Communication & Stakeholder Engagement (EngageOS)
        </h1>
        <p className="text-muted-foreground">
          Omnichannel dispatch orchestration, AI personalization, event-driven workflows, conversational chatbots, and GDPR-compliant consent management.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="radar">Live Dispatch Radar</TabsTrigger>
          <TabsTrigger value="studio">Campaign Studio & A/B</TabsTrigger>
          <TabsTrigger value="workflows">Workflow Canvas</TabsTrigger>
          <TabsTrigger value="chat">Conversational Hub</TabsTrigger>
          <TabsTrigger value="analytics">Engagement Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="radar">
          <DispatchRadarPanel />
        </TabsContent>
        <TabsContent value="studio">
          <CampaignStudioPanel />
        </TabsContent>
        <TabsContent value="workflows">
          <WorkflowCanvasPanel />
        </TabsContent>
        <TabsContent value="chat">
          <ConversationalDeskPanel />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsDashboardPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
