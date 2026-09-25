'use client';

import React from 'react';
import { AlumniJobPostingItem } from '@/lib/operations/alumni/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface JobPlacementTabProps {
  jobs: AlumniJobPostingItem[];
  onRefresh?: () => void;
}

export function JobPlacementTab({ jobs, onRefresh }: JobPlacementTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((job) => (
          <Card key={job.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{job.title}</CardTitle>
                  <p className="text-xs text-slate-500 font-medium">{job.company} • {job.location}</p>
                </div>
                <Badge variant={job.status === 'published' ? 'success' : 'warning'}>
                  {job.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex gap-2 text-xs">
                <span className="bg-slate-100 px-2 py-1 rounded text-slate-700 font-medium">
                  {job.roleType.replace('_', ' ')}
                </span>
                <span className="bg-slate-100 px-2 py-1 rounded text-slate-700 font-medium">
                  {job.workplaceType}
                </span>
                {job.hasAlumniReferral && (
                  <span className="bg-teal-50 text-teal-700 px-2 py-1 rounded font-medium border border-teal-200">
                    Alumni Referral
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 line-clamp-2">{job.description}</p>
              <div className="pt-2 flex justify-between items-center text-xs text-slate-500 border-t border-slate-100">
                <span>{job.viewsCount} Views • {job.applicationsCount} Applications</span>
                <span className="font-semibold text-slate-800">
                  {job.salaryCurrency} {((job.minSalary || 0) / 100000).toFixed(1)}L - {((job.maxSalary || 0) / 100000).toFixed(1)}L
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {jobs.length === 0 && (
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No job postings currently active.
        </div>
      )}
    </div>
  );
}
