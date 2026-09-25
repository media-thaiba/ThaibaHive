'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StudentCarbonGamificationCard } from './student-carbon-gamification-card';
import { Sun, Wind, Battery, Leaf, ShieldCheck, TreePine } from 'lucide-react';

export function GreenCampusPortal() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      {/* Public Banner */}
      <div className="text-center space-y-3 py-6">
        <Badge variant="success" className="px-3 py-1 text-xs">
          Live Campus Decarbonization Hub
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Towards a Net-Zero 2030 Campus
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto">
          Real-time clean energy generation, autonomous microgrid power management, and verifiable Scope 1/2/3 carbon reduction progress.
        </p>
      </div>

      {/* Public Live KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-amber-800 uppercase">Live Solar Output</CardTitle>
            <Sun className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-amber-950">245.5 kW</div>
            <p className="text-xs text-amber-700 mt-1">Generating 1,850 kWh today</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-800 uppercase">Clean Energy Share</CardTitle>
            <Leaf className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-950">79.2%</div>
            <p className="text-xs text-emerald-700 mt-1">Direct solar + BESS battery feed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-blue-800 uppercase">Avoided Emissions</CardTitle>
            <TreePine className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-950">14.8 Tons</div>
            <p className="text-xs text-blue-700 mt-1">Equivalent to 720 trees planted</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-purple-800 uppercase">Audit Proof State</CardTitle>
            <ShieldCheck className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-purple-950">100% Verifiable</div>
            <p className="text-xs text-purple-700 mt-1">SHA-256 Merkle anchored</p>
          </CardContent>
        </Card>
      </div>

      {/* Student Carbon Gamification Wallet */}
      <StudentCarbonGamificationCard />

      {/* Net-Zero 2030 Roadmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campus Decarbonization Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <Badge variant="success" className="mb-2">Phase 1: 2024</Badge>
              <div className="font-bold text-xs text-slate-800">500 kW Rooftop Solar</div>
              <p className="text-[11px] text-slate-500 mt-1">100% Completed</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <Badge variant="success" className="mb-2">Phase 2: 2025</Badge>
              <div className="font-bold text-xs text-slate-800">500 kWh BESS Storage</div>
              <p className="text-[11px] text-slate-500 mt-1">Operational &amp; Synced</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Badge variant="info" className="mb-2">Phase 3: 2026</Badge>
              <div className="font-bold text-xs text-slate-800">V2G Fleet &amp; Smart EV</div>
              <p className="text-[11px] text-blue-700 mt-1">Active Deployment</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <Badge variant="secondary" className="mb-2">Phase 4: 2030</Badge>
              <div className="font-bold text-xs text-slate-800">100% Net-Zero Campus</div>
              <p className="text-[11px] text-slate-500 mt-1">Full Scope 1/2/3 Neutrality</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
