'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TemplateDesignerTab } from '@/components/operations/docgen/template-designer-tab';
import { BatchGeneratorTab } from '@/components/operations/docgen/batch-generator-tab';
import { ExportQueueTab } from '@/components/operations/docgen/export-queue-tab';
import { VerificationLedgerTab } from '@/components/operations/docgen/verification-ledger-tab';
import { PushTelemetryTab } from '@/components/operations/docgen/push-telemetry-tab';

export default function DocumentHubAdminPage() {
  const [activeTab, setActiveTab] = useState('templates');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Generation & Universal Export Hub (DOC-GEN)"
        description="Autonomous examination PDF generation, cryptographic QR anti-counterfeiting, high-throughput streaming exports, and mobile academic synchronization."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="templates">Template Designer</TabsTrigger>
          <TabsTrigger value="batch">Batch Generator</TabsTrigger>
          <TabsTrigger value="export">Export Streams</TabsTrigger>
          <TabsTrigger value="verification">Verification Ledger</TabsTrigger>
          <TabsTrigger value="telemetry">Push &amp; Sync Telemetry</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <TemplateDesignerTab />
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <BatchGeneratorTab />
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <ExportQueueTab />
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
          <VerificationLedgerTab />
        </TabsContent>

        <TabsContent value="telemetry" className="space-y-4">
          <PushTelemetryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
