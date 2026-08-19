'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Activity, GitMerge, Clock, Sparkles } from 'lucide-react';

interface ForensicPanelProps {
  reports: any[];
  analyzing: boolean;
  onRunDemoAnalysis: () => Promise<void>;
}

export function ForensicCopilotPanel({
  reports,
  analyzing,
  onRunDemoAnalysis,
}: ForensicPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Automated Forensic Root-Cause Copilot
          </h3>
          <p className="text-xs text-muted-foreground">
            Multi-stage attack correlation, chronological event sequencing, and root-cause DAG reconstruction
          </p>
        </div>
        <Button onClick={onRunDemoAnalysis} disabled={analyzing}>
          <Activity className="h-4 w-4 mr-1" />
          {analyzing ? 'Synthesizing...' : 'Run Forensic Correlation Demo'}
        </Button>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10 text-muted-foreground">
            No forensic investigations active. Run correlation on incoming security signals to synthesize root-cause DAGs.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((rep) => {
            const timeline = Array.isArray(rep.timeline)
              ? rep.timeline
              : typeof rep.timeline === 'string'
              ? JSON.parse(rep.timeline || '[]')
              : [];

            const graph =
              typeof rep.rootCauseGraph === 'string'
                ? JSON.parse(rep.rootCauseGraph || '{"nodes":[],"edges":[]}')
                : rep.rootCauseGraph || { nodes: [], edges: [] };

            return (
              <Card key={rep.reportId || rep.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Incident {rep.incidentId || rep.id} — Target Actor: {rep.primaryActor}
                    </CardTitle>
                    <Badge variant="info">
                      Analyzed in {rep.durationMs ? `${rep.durationMs}ms` : '<1s'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-muted/40 rounded-md text-xs leading-relaxed">
                    <div className="font-semibold text-foreground mb-1">Executive Summary</div>
                    {rep.executiveSummary}
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Attack Trajectory Timeline ({timeline.length} events)
                    </div>
                    <div className="rounded-md border text-xs">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Layer</TableHead>
                            <TableHead>ATT&CK Stage</TableHead>
                            <TableHead>Signal / Description</TableHead>
                            <TableHead>Severity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {timeline.map((evt: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="font-bold">{evt.sequenceNumber || i + 1}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{evt.layer}</Badge>
                              </TableCell>
                              <TableCell className="font-semibold">{evt.stage}</TableCell>
                              <TableCell>{evt.description}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    evt.severity === 'CRITICAL'
                                      ? 'destructive'
                                      : evt.severity === 'HIGH'
                                      ? 'warning'
                                      : 'info'
                                  }
                                >
                                  {evt.severity}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <GitMerge className="h-3.5 w-3.5" />
                      Root-Cause DAG Graph Nodes ({graph.nodes?.length || 0} nodes, {graph.edges?.length || 0} edges)
                    </div>
                    <div className="p-3 bg-card border rounded-md flex flex-wrap gap-2 text-xs">
                      {graph.nodes?.map((node: any) => (
                        <div
                          key={node.id}
                          className="px-2.5 py-1 rounded border bg-muted/60 flex items-center gap-1.5"
                        >
                          <span className="font-mono text-[10px] text-muted-foreground">{node.type}</span>
                          <span className="font-medium">{node.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
