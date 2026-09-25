'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureArray } from '@/lib/utils';

export function ExportQueueTab() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState('students');
  const [selectedFormat, setSelectedFormat] = useState('csv');

  const fetchJobs = () => {
    setLoading(true);
    fetch('/api/export/jobs')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setJobs(ensureArray(data.jobs));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch export jobs:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleTriggerExport = () => {
    setIsExporting(true);

    const mockData = Array.from({ length: 50 }).map((_, i) => ({
      rollNumber: `TGCIS-${100 + i}`,
      name: `Student ${i + 1}`,
      className: 'Grade 11 Science',
      email: `student${i + 1}@thaiba.edu`,
      phone: '9847123456',
      status: 'active',
    }));

    fetch('/api/export/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institutionId: 'inst-001',
        jobType: selectedDataset,
        format: selectedFormat,
        data: mockData,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          fetchJobs();
        }
      })
      .catch((err) => {
        console.error('Trigger export error:', err);
      })
      .finally(() => {
        setIsExporting(false);
      });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Universal Streaming Export Launcher</CardTitle>
          <CardDescription>
            Stream large institutional datasets in high-throughput CSV, XLSX, JSON, or Tabular formats with zero memory exhaustion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dataset Category</label>
              <select
                aria-label="Dataset Category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value)}
              >
                <option value="students">Student Roster &amp; Profiles</option>
                <option value="timetables">Academic Timetable Matrix</option>
                <option value="attendance">Daily Attendance Ledgers</option>
                <option value="grades">Examination Tabulation Registers</option>
                <option value="finances">Fee Ledgers &amp; Expense Statements</option>
                <option value="audit_logs">Platform Compliance Audit Logs</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Format</label>
              <select
                aria-label="Export Format"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
              >
                <option value="csv">Comma-Separated Values (.csv)</option>
                <option value="xlsx">Microsoft Excel (.xlsx)</option>
                <option value="json">Standard JSON (.json)</option>
                <option value="pdf">Tabular PDF Print (.html)</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" disabled={isExporting} onClick={handleTriggerExport}>
                {isExporting ? 'Initiating Export Stream...' : 'Trigger Export Job'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base">Recent Export Streams</CardTitle>
              <CardDescription>Track background export job completion states and download artifacts</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchJobs}>
              Refresh Queue
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No recent export jobs found. Trigger an export above to start.
            </div>
          ) : (
            <div className="border rounded-md divide-y">
              {jobs.map((job) => (
                <div key={job.id} className="p-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <span className="uppercase font-mono">{job.jobType}</span>
                      <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                        {job.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Format: <span className="uppercase font-mono">{job.format}</span> | Records: {job.processedRecords} / {job.totalRecords} | Progress: {job.progressPercent}%
                    </div>
                  </div>
                  <div>
                    {job.status === 'completed' && job.downloadUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(job.downloadUrl, '_blank')}
                      >
                        Download Artifact
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
