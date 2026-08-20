'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraphExplorerPanel } from '@/components/operations/km/graph-explorer-panel';
import { RagPlaygroundPanel } from '@/components/operations/km/rag-playground-panel';
import { Network, Search, Layers, GraduationCap, BarChart3 } from 'lucide-react';

export default function KnowledgeMeshRadarPage() {
  const [activeTab, setActiveTab] = useState('graph');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Knowledge Mesh & Campus Copilot Radar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Autonomous institutional knowledge graph, hybrid RAG retrieval, and academic advising studio
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="success">Engine: Active</Badge>
          <Badge variant="info">v3.31.0 NeoBrain</Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="graph" className="flex items-center gap-1.5">
            <Network className="h-4 w-4" />
            Graph Explorer
          </TabsTrigger>
          <TabsTrigger value="rag" className="flex items-center gap-1.5">
            <Search className="h-4 w-4" />
            Hybrid RAG
          </TabsTrigger>
          <TabsTrigger value="ingest" className="flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            Ingestion Studio
          </TabsTrigger>
          <TabsTrigger value="degree" className="flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4" />
            Degree Rules
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="graph">
          <GraphExplorerPanel />
        </TabsContent>

        <TabsContent value="rag">
          <RagPlaygroundPanel />
        </TabsContent>

        <TabsContent value="ingest">
          <Card>
            <CardHeader>
              <CardTitle>Document Ingestion & Chunk Inspector</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Automated document parsing for academic syllabi, bylaws, and faculty research repositories with change-detection hashing and zero-duplicate indexing.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="degree">
          <Card>
            <CardHeader>
              <CardTitle>Curriculum & Prerequisite Rule Studio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Configure degree program mandatory credits, core distribution models, and topological constraint solvers for automatic degree audits.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Cognitive Telemetry & Knowledge Gaps</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Real-time deflection rates, query satisfaction ratings, unanswered knowledge gaps, and OpenMetrics prometheus telemetry export.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
