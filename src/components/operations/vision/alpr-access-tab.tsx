'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Car, ShieldCheck, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

export function AlprAccessTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlprData = () => {
    setLoading(true);
    fetch('/api/vision/alpr')
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs || []);
        setWhitelist(data.whitelist || []);
        setLoading(false);
      })
      .catch(() => {
        setLogs([
          {
            logId: 'alpr_01',
            plateNumber: 'KA-01-AB-1234',
            direction: 'entry',
            gateId: 'main_gate',
            permitStatus: 'authorized_staff',
            gateActuated: true,
            capturedAt: new Date().toISOString(),
          },
          {
            logId: 'alpr_02',
            plateNumber: 'BAD-9999',
            direction: 'entry',
            gateId: 'north_gate',
            permitStatus: 'blacklisted',
            gateActuated: false,
            capturedAt: new Date().toISOString(),
          },
        ]);
        setWhitelist([
          {
            permitId: 'prm_01',
            plateNumber: 'KA-01-AB-1234',
            ownerName: 'Dr. Sarah Smith',
            ownerType: 'staff',
            isBlacklisted: false,
            status: 'active',
          },
          {
            permitId: 'prm_02',
            plateNumber: 'BAD-9999',
            ownerName: 'Flagged Suspect Vehicle',
            ownerType: 'vendor',
            isBlacklisted: true,
            blacklistReason: 'Trespassing record',
            status: 'suspended',
          },
        ]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAlprData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">ALPR Optical Character Recognition &amp; Gate Control</h2>
          <p className="text-xs text-slate-500">Autonomous barrier actuation, parking occupancy tracking, and whitelist/blacklist management</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchAlprData}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-Time ALPR Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4 text-indigo-600" />
              Live Gate Ingress / Egress Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plate Number</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Gate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Barrier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-6">
                        No vehicle logs recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((l) => (
                      <TableRow key={l.logId}>
                        <TableCell className="font-mono font-bold text-slate-900">{l.plateNumber}</TableCell>
                        <TableCell className="capitalize">{l.direction}</TableCell>
                        <TableCell>{l.gateId}</TableCell>
                        <TableCell>
                          <Badge variant={l.permitStatus === 'blacklisted' ? 'destructive' : l.gateActuated ? 'success' : 'secondary'}>
                            {l.permitStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {l.gateActuated ? (
                            <span className="flex items-center text-emerald-600 text-xs gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Opened
                            </span>
                          ) : (
                            <span className="flex items-center text-rose-600 text-xs gap-1">
                              <XCircle className="h-3.5 w-3.5" /> Locked
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Whitelist / Blacklist Registry */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Permit Whitelist &amp; Threat Blacklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plate</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Standing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whitelist.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 py-6">
                        No vehicle permits registered.
                      </TableCell>
                    </TableRow>
                  ) : (
                    whitelist.map((w) => (
                      <TableRow key={w.permitId}>
                        <TableCell className="font-mono font-semibold text-slate-900">{w.plateNumber}</TableCell>
                        <TableCell>{w.ownerName}</TableCell>
                        <TableCell className="capitalize">{w.ownerType}</TableCell>
                        <TableCell>
                          {w.isBlacklisted ? (
                            <Badge variant="destructive">BLACKLISTED</Badge>
                          ) : (
                            <Badge variant="success">AUTHORIZED</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
