'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { JobSubmissionModal } from '@/components/operations/neuro/job-submission-modal';
import { LiveTerminalDrawer } from '@/components/operations/neuro/live-terminal-drawer';
import { NeuroClusterItem, NeuroJobItem } from '@/lib/operations/neuro/neuro-types';
import { ensureArray } from '@/lib/utils';

export default function ResearchExperimentsPage() {
  const [jobs, setJobs] = useState<NeuroJobItem[]>([]);
  const [clusters, setClusters] = useState<NeuroClusterItem[]>([]);
  const [selectedJob, setSelectedJob] = useState<NeuroJobItem | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setIsLoading(true);
    setError(null);

    Promise.all([
      fetch('/api/neuro/jobs').then((res) => res.json()),
      fetch('/api/neuro/clusters').then((res) => res.json()),
    ])
      .then(([jobsData, clustersData]) => {
        setJobs(ensureArray(jobsData.jobs));
        setClusters(ensureArray(clustersData.clusters));
      })
      .catch((err) => {
        setError(err.message || 'Failed to load experiment data');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleJobSubmit = async (jobPayload: any) => {
    const res = await fetch('/api/neuro/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobPayload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit job');
    }
    fetchData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="success">Running</Badge>;
      case 'queued':
      case 'pending':
        return <Badge variant="info">Queued</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'preempted':
      case 'failed':
        return <Badge variant="destructive">{status.toUpperCase()}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Researcher Experiment Portal & Job Launcher"
        description="Self-Service Interactive Notebooks, Distributed Training & Reproducibility Lineage"
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading}>
              Refresh
            </Button>
            <Button onClick={() => setIsSubmitModalOpen(true)} size="sm">
              + New Experiment
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="error">
          <p>{error}</p>
        </Alert>
      )}

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Card className="border border-border/60 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Submitted Compute Experiments & Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">Job Name</th>
                    <th className="py-2.5 px-3 font-medium">Department</th>
                    <th className="py-2.5 px-3 font-medium">Type</th>
                    <th className="py-2.5 px-3 font-medium">Priority</th>
                    <th className="py-2.5 px-3 font-medium">GPUs</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                    <th className="py-2.5 px-3 font-medium">Runtime</th>
                    <th className="py-2.5 px-3 font-medium text-right">Logs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        No active compute jobs found. Click &quot;+ New Experiment&quot; to launch a distributed workload.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((j) => (
                      <tr key={j.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-foreground">{j.jobName}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{j.departmentId}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">{j.jobType}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant="secondary" className="text-[10px] uppercase">{j.priority}</Badge>
                        </td>
                        <td className="py-2.5 px-3 font-bold font-mono">{j.requestedGpus}x {j.gpuModelRequirement}</td>
                        <td className="py-2.5 px-3">{getStatusBadge(j.status)}</td>
                        <td className="py-2.5 px-3 font-mono text-muted-foreground">{j.runtimeSeconds}s</td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedJob(j)}
                            className="h-6 text-[10px] px-2"
                          >
                            Live Stream
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <JobSubmissionModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleJobSubmit}
        clusterId={clusters[0]?.id || 'cluster_default'}
      />

      <LiveTerminalDrawer
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </div>
  );
}
