'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MentorshipMeshTabProps {
  onRefresh?: () => void;
}

export function MentorshipMeshTab({ onRefresh }: MentorshipMeshTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-slate-500 font-semibold tracking-wider">
              Active Mentors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">48</div>
            <p className="text-xs text-slate-500 mt-1">Across 14 industries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-slate-500 font-semibold tracking-wider">
              Delivered Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-600">312 hrs</div>
            <p className="text-xs text-slate-500 mt-1">98.4% student satisfaction rating</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-slate-500 font-semibold tracking-wider">
              Match Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">94.2%</div>
            <p className="text-xs text-slate-500 mt-1">AI Skill Graph & Career compatibility</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Mentorship Mesh Telemetry & Capacity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div>
                <div className="font-medium text-slate-800">Artificial Intelligence & Cloud Architecture</div>
                <div className="text-xs text-slate-500">18 Active Mentors • 42 Mentees Enrolled</div>
              </div>
              <Badge variant="success">High Capacity</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div>
                <div className="font-medium text-slate-800">Investment Banking & Corporate Finance</div>
                <div className="text-xs text-slate-500">12 Active Mentors • 28 Mentees Enrolled</div>
              </div>
              <Badge variant="info">Optimal</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div>
                <div className="font-medium text-slate-800">Robotics & Embedded Systems</div>
                <div className="text-xs text-slate-500">10 Active Mentors • 24 Mentees Enrolled</div>
              </div>
              <Badge variant="warning">Near Capacity</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
