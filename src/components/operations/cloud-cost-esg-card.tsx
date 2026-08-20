'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Cloud, Leaf } from 'lucide-react';

interface CloudCostEsgCardProps {
  cloudData: { resources: any[]; recommendations: any[]; totalEstimatedSavingsDollars: number };
  carbonData: { esgReport: any; emissions: any; initiatives: any[] };
  isLoading: boolean;
}

export function CloudCostEsgCard({ cloudData, carbonData, isLoading }: CloudCostEsgCardProps) {
  if (isLoading) {
    return (
      <Card className="border-slate-800 bg-slate-950/60 shadow-md">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { esgReport, emissions } = carbonData;

  return (
    <Card className="border-slate-800 bg-slate-950/60 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center space-x-2">
          <Leaf className="h-5 w-5 text-emerald-400" />
          <CardTitle className="text-base font-semibold text-slate-100">
            Cloud Cost & ESG Sustainability
          </CardTitle>
        </div>
        <Badge variant="success">GRI 305 Compliant</Badge>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <div>
            <div className="flex items-center space-x-1 text-xs text-slate-400">
              <Cloud className="h-3.5 w-3.5 text-sky-400" />
              <span>Cloud Rightsizing Savings</span>
            </div>
            <div className="text-lg font-bold text-sky-400">
              ${cloudData.totalEstimatedSavingsDollars.toFixed(2)}/mo
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-1 text-xs text-slate-400">
              <Leaf className="h-3.5 w-3.5 text-emerald-400" />
              <span>Renewable Energy Ratio</span>
            </div>
            <div className="text-lg font-bold text-emerald-400">
              {esgReport?.renewableEnergyRatioPercent || 0}%
            </div>
          </div>
        </div>

        <div className="space-y-1 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>Scope 1 (Fleet Fuel):</span>
            <span className="font-mono text-slate-200">{emissions?.scope1FleetFuelKgCo2e || 0} kg CO2e</span>
          </div>
          <div className="flex justify-between">
            <span>Scope 2 (Grid Power):</span>
            <span className="font-mono text-slate-200">{emissions?.scope2GridElectricityKgCo2e || 0} kg CO2e</span>
          </div>
          <div className="flex justify-between">
            <span>Scope 3 (Cloud Compute):</span>
            <span className="font-mono text-slate-200">{emissions?.scope3CloudComputeKgCo2e || 0} kg CO2e</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
