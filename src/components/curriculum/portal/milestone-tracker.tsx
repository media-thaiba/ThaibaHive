'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const MilestoneTracker: React.FC = () => {
  const milestones = [
    { title: 'Lower Division Core Completed', status: 'completed', term: 'Year 2 Spring' },
    { title: 'Major Concentration Declared', status: 'completed', term: 'Year 3 Fall' },
    { title: 'Industrial Internship / Practicum', status: 'in_progress', term: 'Year 3 Summer' },
    { title: 'Senior Capstone Project (CS401/402)', status: 'planned', term: 'Year 4' },
    { title: 'Graduation Degree Audit Clearance', status: 'planned', term: 'Final Term' },
  ];

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span>Academic Milestones & Residency Checklist</span>
          <Badge variant="outline">2/5 Cleared</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 divide-y text-xs">
        {milestones.map((m, idx) => (
          <div key={idx} className="py-2.5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">{m.title}</p>
              <p className="text-muted-foreground text-[11px]">{m.term}</p>
            </div>
            <Badge variant={m.status === 'completed' ? 'success' : m.status === 'in_progress' ? 'info' : 'secondary'}>
              {m.status.replace('_', ' ')}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
