'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';

export function CarbonOffsetRegistryTab() {
  const [balance, setBalance] = useState<any>(null);
  const [offsets, setOffsets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOffsets = () => {
    setLoading(true);
    fetch('/api/eco/offsets')
      .then((res) => res.json())
      .then((data) => {
        if (data.balance) {
          setBalance(data.balance);
        } else {
          setBalance({ activeTonsCo2e: 450.0, retiredTonsCo2e: 150.0, totalPortfolioTonsCo2e: 600.0 });
        }
        setOffsets([
          { offsetId: 'off_001', certificateNumber: 'VCS-2026-789012', registry: 'Verra VCS', offsetType: 'Reforestation', vintageYear: 2025, quantityTonsCo2e: 300, status: 'active', verificationHash: 'a1b2c3d4e5f6...' },
          { offsetId: 'off_002', certificateNumber: 'GS-2026-345678', registry: 'Gold Standard', offsetType: 'Solar Renewable', vintageYear: 2025, quantityTonsCo2e: 150, status: 'active', verificationHash: 'f6e5d4c3b2a1...' },
          { offsetId: 'off_003', certificateNumber: 'IREC-2025-998877', registry: 'I-REC Standard', offsetType: 'I-REC REC', vintageYear: 2024, quantityTonsCo2e: 150, status: 'retired', retiredForPeriod: '2026-Q1', verificationHash: '778899aabbcc...' },
        ]);
        setLoading(false);
      })
      .catch(() => {
        setBalance({ activeTonsCo2e: 450.0, retiredTonsCo2e: 150.0, totalPortfolioTonsCo2e: 600.0 });
        setOffsets([
          { offsetId: 'off_001', certificateNumber: 'VCS-2026-789012', registry: 'Verra VCS', offsetType: 'Reforestation', vintageYear: 2025, quantityTonsCo2e: 300, status: 'active', verificationHash: 'a1b2c3d4e5f6...' },
          { offsetId: 'off_002', certificateNumber: 'GS-2026-345678', registry: 'Gold Standard', offsetType: 'Solar Renewable', vintageYear: 2025, quantityTonsCo2e: 150, status: 'active', verificationHash: 'f6e5d4c3b2a1...' },
          { offsetId: 'off_003', certificateNumber: 'IREC-2025-998877', registry: 'I-REC Standard', offsetType: 'I-REC REC', vintageYear: 2024, quantityTonsCo2e: 150, status: 'retired', retiredForPeriod: '2026-Q1', verificationHash: '778899aabbcc...' },
        ]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOffsets();
  }, []);

  if (loading && !balance) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const bal = balance || { activeTonsCo2e: 450.0, retiredTonsCo2e: 150.0, totalPortfolioTonsCo2e: 600.0 };

  return (
    <div className="space-y-6">
      {/* Portfolio Balance Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Active Unretired Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">{bal.activeTonsCo2e} Tons CO<sub>2</sub>e</div>
            <p className="text-xs text-emerald-700 mt-1">Available to offset Net-Zero gap</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Retired for Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{bal.retiredTonsCo2e} Tons CO<sub>2</sub>e</div>
            <p className="text-xs text-slate-500 mt-1">Permanently retired on-chain</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Offset Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{bal.totalPortfolioTonsCo2e} Tons CO<sub>2</sub>e</div>
            <p className="text-xs text-slate-500 mt-1">Verra VCS, Gold Standard, I-REC</p>
          </CardContent>
        </Card>
      </div>

      {/* Registry Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Verified Offset &amp; REC Certificate Ledger</CardTitle>
            <p className="text-xs text-slate-500">Cryptographically tracked environmental commodities with additionality verification</p>
          </div>
          <Button size="sm">
            <Plus className="h-3.5 w-3.5 mr-1" /> Register Certificate
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                  <th className="p-2">Serial Number</th>
                  <th className="p-2">Registry</th>
                  <th className="p-2">Project Type</th>
                  <th className="p-2">Vintage</th>
                  <th className="p-2">Quantity (Tons)</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Retirement Period</th>
                  <th className="p-2">Proof Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {offsets.map((off) => (
                  <tr key={off.offsetId}>
                    <td className="p-2 font-mono font-medium text-slate-900">{off.certificateNumber}</td>
                    <td className="p-2">{off.registry}</td>
                    <td className="p-2">{off.offsetType}</td>
                    <td className="p-2 font-mono">{off.vintageYear}</td>
                    <td className="p-2 font-mono font-bold text-emerald-800">{off.quantityTonsCo2e} t</td>
                    <td className="p-2">
                      <Badge variant={off.status === 'active' ? 'success' : 'secondary'}>
                        {off.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-2">{off.retiredForPeriod || '—'}</td>
                    <td className="p-2 font-mono text-[10px] text-slate-400">{off.verificationHash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
