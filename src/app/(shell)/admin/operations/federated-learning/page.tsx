'use client';

import React, { useState } from 'react';
import { ModelRegistryTab } from '@/components/operations/federated/model-registry-tab';
import { NodeMeshTab } from '@/components/operations/federated/node-mesh-tab';
import { PrivacyBudgetTab } from '@/components/operations/federated/privacy-budget-tab';
import { DriftMonitorTab } from '@/components/operations/federated/drift-monitor-tab';
import { CrossCampusBenchmarksTab } from '@/components/operations/federated/cross-campus-benchmarks-tab';

export default function FederatedLearningPage() {
  const [activeTab, setActiveTab] = useState<'models' | 'nodes' | 'privacy' | 'drift' | 'benchmarks'>('models');

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Autonomous Federated Edge Learning (A-FED / EdgeMesh)</h1>
        <p className="text-muted-foreground">
          Decentralized edge model orchestration, Differential Privacy accounting, covariate drift detection, and cross-campus intelligence.
        </p>
      </div>

      <div className="border-b border-border">
        <nav className="flex space-x-8" aria-label="Tabs">
          {[
            { id: 'models', label: 'Model Registry' },
            { id: 'nodes', label: 'Edge Mesh' },
            { id: 'privacy', label: 'Privacy Budget ($\epsilon, \delta$)' },
            { id: 'drift', label: 'Drift & Retraining' },
            { id: 'benchmarks', label: 'Cross-Campus Benchmarks' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-4">
        {activeTab === 'models' && <ModelRegistryTab />}
        {activeTab === 'nodes' && <NodeMeshTab />}
        {activeTab === 'privacy' && <PrivacyBudgetTab />}
        {activeTab === 'drift' && <DriftMonitorTab />}
        {activeTab === 'benchmarks' && <CrossCampusBenchmarksTab />}
      </div>
    </div>
  );
}
