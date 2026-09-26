'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, CheckCircle2, ArrowRight, TrendingUp } from 'lucide-react';

export function SpaceOptimizationTab() {
  const [proposals, setProposals] = useState([
    {
      id: 'PROP-01',
      title: 'Advanced AI Seminar',
      expectedAttendance: 22,
      fromSpace: 'SEC-201 (150 seats - 14% util)',
      toSpace: 'SEC-102 (25 seats - 88% util)',
      gainPct: 74,
      kwhSaved: 18.5,
      status: 'pending',
    },
    {
      id: 'PROP-02',
      title: 'Distributed Systems Lab',
      expectedAttendance: 32,
      fromSpace: 'SEC-101 (35 seats - 91% util)',
      toSpace: 'SEC-202 (40 seats - 80% util)',
      gainPct: 15,
      kwhSaved: 6.2,
      status: 'pending',
    },
  ]);

  const handleApprove = (id: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'applied' } : p))
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-slate-500 font-medium">Campus Space Efficiency</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">78.4%</div>
            <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> +22.5% vs baseline
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-slate-500 font-medium">Predictive HVAC Reduction</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">18.2%</div>
            <div className="text-xs text-slate-500 mt-1">~420 kWh saved / week</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-slate-500 font-medium">Estimated Monthly Savings</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">$4,850</div>
            <div className="text-xs text-slate-500 mt-1">Energy & maintenance</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="text-xs text-slate-500 font-medium">Optimization Model</div>
            <div className="text-2xl font-bold text-sky-600 mt-1">Holt-Winters</div>
            <div className="text-xs text-slate-500 mt-1">Confidence 92.4%</div>
          </CardContent>
        </Card>
      </div>

      {/* AI Reallocation Proposals Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Autonomous Space Reallocation Proposals
            </CardTitle>
            <Badge variant="info">2 Recommendations Available</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {proposals.map((prop) => (
              <div
                key={prop.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    {prop.title}
                    <Badge variant="secondary">{prop.expectedAttendance} Attendees</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="line-through text-slate-400">{prop.fromSpace}</span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="font-medium text-slate-900">{prop.toSpace}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-emerald-600">+{prop.gainPct}% Utilization</div>
                    <div className="text-slate-500">{prop.kwhSaved} kWh HVAC Saved</div>
                  </div>

                  {prop.status === 'applied' ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Applied
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(prop.id)}
                      className="h-8 text-xs font-semibold"
                    >
                      Apply Reallocation
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
