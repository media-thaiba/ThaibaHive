'use client';

import React from 'react';
import { AlumniDonationCampaignItem } from '@/lib/operations/alumni/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EndowmentCampaignTabProps {
  campaigns: AlumniDonationCampaignItem[];
  onRefresh?: () => void;
}

export function EndowmentCampaignTab({ campaigns, onRefresh: _onRefresh }: EndowmentCampaignTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map((camp) => {
          const progress = camp.targetAmount > 0 ? Math.min(100, Math.round((camp.raisedAmount / camp.targetAmount) * 100)) : 0;
          return (
            <Card key={camp.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">{camp.title}</CardTitle>
                    <p className="text-xs text-slate-500 font-mono">{camp.code}</p>
                  </div>
                  <Badge variant={camp.status === 'active' ? 'success' : 'secondary'}>
                    {camp.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p className="text-xs text-slate-600 line-clamp-2">{camp.description}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-600">Raised: ₹{(camp.raisedAmount / 100000).toFixed(2)}L</span>
                    <span className="text-slate-900 font-semibold">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-teal-600 h-2 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Target: ₹{(camp.targetAmount / 100000).toFixed(2)}L</span>
                    <span>{camp.donorCount} Donors</span>
                  </div>
                </div>
                {camp.isTaxExempt80G && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-medium">
                    <span>✓ 80G Tax Exempt Eligible</span>
                    <span>100% Tax Deductible</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {campaigns.length === 0 && (
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No endowment campaigns currently configured.
        </div>
      )}
    </div>
  );
}
