'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShieldCheck, RefreshCw, AlertTriangle, Cpu } from 'lucide-react';

interface MetricsProps {
  metrics: {
    totalMtlsHandshakes?: number;
    totalRotations?: number;
    totalVulnerabilities?: number;
    avgForensicDurationSec?: number;
  };
}

export function ZeroTrustMetricsCard({ metrics }: MetricsProps) {
  const cards = [
    {
      title: 'mTLS Handshakes',
      value: metrics.totalMtlsHandshakes ?? 0,
      icon: ShieldCheck,
      desc: 'Active mutual TLS peer authentications',
    },
    {
      title: 'Cert Rotations',
      value: metrics.totalRotations ?? 0,
      icon: RefreshCw,
      desc: 'Automated zero-downtime rotations',
    },
    {
      title: 'Supply Chain CVEs',
      value: metrics.totalVulnerabilities ?? 0,
      icon: AlertTriangle,
      desc: 'Active open dependency advisories',
    },
    {
      title: 'Forensic Copilot Latency',
      value: `${metrics.avgForensicDurationSec ?? 0}s`,
      icon: Cpu,
      desc: 'Avg root-cause DAG correlation duration',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
