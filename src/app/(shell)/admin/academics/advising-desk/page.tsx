'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCheck, MessageSquare, CheckCircle } from 'lucide-react';

export default function AdvisingDeskPage() {
  const pendingInterventions = [
    {
      studentId: 'STD-2024-089',
      name: 'Sarah Khan',
      major: 'Computer Science',
      riskTier: 'critical_intervention' as const,
      reason: '2 course failures (MATH-102, CS-102) & 62% attendance',
      action: 'Mandatory Advisor Meeting Required',
    },
    {
      studentId: 'STD-2025-144',
      name: 'Ali Mansour',
      major: 'Computer Science',
      riskTier: 'moderate_risk' as const,
      reason: 'Prerequisite shortfall for CS-301 registration',
      action: 'Prerequisite Waiver Review',
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Academic Advisor Review Workbench
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Human-in-the-loop review desk for AI copilot student interventions and degree audit approvals
          </p>
        </div>
        <Badge variant="info">Counselor Mode</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-red-50/50 border-red-200">
          <div className="text-red-700 font-bold text-2xl">1</div>
          <div className="text-xs text-red-600 font-medium">Critical Interventions Pending</div>
        </Card>
        <Card className="p-4 bg-amber-50/50 border-amber-200">
          <div className="text-amber-700 font-bold text-2xl">1</div>
          <div className="text-xs text-amber-600 font-medium">Prerequisite Reviews</div>
        </Card>
        <Card className="p-4 bg-emerald-50/50 border-emerald-200">
          <div className="text-emerald-700 font-bold text-2xl">48</div>
          <div className="text-xs text-emerald-600 font-medium">Autonomously Resolved by Copilot</div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-indigo-600" />
            Pending Student Advising Interventions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingInterventions.map((item, idx) => (
            <div key={idx} className="p-4 bg-slate-50 border rounded-lg flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 text-sm">{item.name}</span>
                  <span className="text-xs text-slate-400">({item.studentId})</span>
                  <Badge variant={item.riskTier === 'critical_intervention' ? 'destructive' : 'warning'}>
                    {item.riskTier}
                  </Badge>
                </div>
                <div className="text-xs text-slate-600">{item.reason}</div>
                <div className="text-xs text-indigo-600 font-medium">Recommended: {item.action}</div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1 text-xs">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Take Over Chat
                </Button>
                <Button size="sm" className="gap-1 text-xs bg-indigo-600 hover:bg-indigo-700">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Approve Plan
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
