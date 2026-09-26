'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Share2, Building2 } from 'lucide-react';

interface CrossCampusResourceGridProps {
  resources: any[];
  recommendations: any[];
  isLoading: boolean;
}

export function CrossCampusResourceGrid({
  resources,
  recommendations: _recommendations,
  isLoading,
}: CrossCampusResourceGridProps) {
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

  return (
    <Card className="border-slate-800 bg-slate-950/60 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center space-x-2">
          <Share2 className="h-5 w-5 text-indigo-400" />
          <CardTitle className="text-base font-semibold text-slate-100">
            Cross-Campus Resource Mesh & CRDT Sync
          </CardTitle>
        </div>
        <Badge variant="info">Mesh Active</Badge>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        <div className="text-xs text-slate-400">
          Decentralized CRDT scheduling across campus boundaries with zero-collision conflict resolution.
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {resources.map((res, idx) => (
            <div
              key={res.resourceId || idx}
              className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/40 p-2.5 text-xs"
            >
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-indigo-400" />
                <div>
                  <div className="font-medium text-slate-200">{res.name}</div>
                  <div className="text-[10px] text-slate-400">
                    Capacity: {res.capacityUnits} units · ${res.hourlyCostRateDollars}/hr
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {res.category}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
