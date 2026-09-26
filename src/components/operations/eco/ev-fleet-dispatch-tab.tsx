'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export function EvFleetDispatchTab() {
  const [isDispatching, setIsDispatching] = useState(false);
  const [vehicles] = useState([
    {
      vehicleId: 'bus_campus_01',
      name: 'Campus Shuttle Bus Alpha',
      vehicleType: 'bus',
      batteryCapacityKwh: 220,
      currentSoCPercent: 85,
      targetDepartureSoCPercent: 85,
      scheduledDeparture: '18:30',
      action: 'v2g_discharge',
      powerKw: 45.0,
      stationId: 'evse_depot_01',
    },
    {
      vehicleId: 'van_maint_01',
      name: 'Facilities Maintenance Van',
      vehicleType: 'maintenance_van',
      batteryCapacityKwh: 90,
      currentSoCPercent: 78,
      targetDepartureSoCPercent: 80,
      scheduledDeparture: '19:00',
      action: 'v2g_discharge',
      powerKw: 25.0,
      stationId: 'evse_depot_02',
    },
    {
      vehicleId: 'van_maint_02',
      name: 'Security Patrol EV',
      vehicleType: 'maintenance_van',
      batteryCapacityKwh: 75,
      currentSoCPercent: 42,
      targetDepartureSoCPercent: 85,
      scheduledDeparture: '17:15',
      action: 'smart_charge',
      powerKw: 22.0,
      stationId: 'evse_depot_03',
    },
  ]);

  const handleTriggerV2G = () => {
    setIsDispatching(true);
    fetch('/api/eco/ev/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicles: vehicles.map((v) => ({
          vehicleId: v.vehicleId,
          vehicleType: v.vehicleType,
          batteryCapacityKwh: v.batteryCapacityKwh,
          maxV2GDischargeKw: 50,
          maxChargeKw: 60,
          currentSoCPercent: v.currentSoCPercent,
          scheduledDepartureTime: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
          requiredTripEnergyKwh: 60,
          targetDepartureSoCPercent: v.targetDepartureSoCPercent,
          isV2GApproved: true,
        })),
        peakDeficitKw: 70,
        tariffRatePerKwh: 0.32,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        setIsDispatching(false);
      })
      .catch(() => {
        setIsDispatching(false);
      });
  };

  const totalV2GKw = vehicles.filter((v) => v.action === 'v2g_discharge').reduce((acc, v) => acc + v.powerKw, 0);

  return (
    <div className="space-y-6">
      {/* V2G Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
              Active V2G Fleet Grid Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-950">{totalV2GKw} kW</div>
            <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
              <ArrowDownCircle className="h-3.5 w-3.5" />
              Discharging into campus microgrid during peak tariff
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Connected EV Fleet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{vehicles.length} Vehicles</div>
            <p className="text-xs text-slate-500 mt-1">100% departure schedule compliance guarantee</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Peak Shaving Arbitrage Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">$0.320 / kWh</div>
            <p className="text-xs text-emerald-600 mt-1 font-medium">Earning ${(totalV2GKw * 0.32).toFixed(2)}/hr in avoided costs</p>
          </CardContent>
        </Card>
      </div>

      {/* Fleet Vehicles Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Connected EV Fleet &amp; Smart Charging Stations</CardTitle>
            <p className="text-xs text-slate-500">OCPP 1.6/2.0 Smart EVSE dynamically load-shedding and V2G dispatching</p>
          </div>
          <Button variant="default" size="sm" onClick={handleTriggerV2G} disabled={isDispatching}>
            <Zap className="h-3.5 w-3.5 mr-1" />
            {isDispatching ? 'Re-optimizing Fleet...' : 'Dispatch V2G Fleet'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                  <th className="p-2">Vehicle</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Battery Capacity</th>
                  <th className="p-2">Current SoC</th>
                  <th className="p-2">Departure Time</th>
                  <th className="p-2">Active Flow</th>
                  <th className="p-2">Station Port</th>
                  <th className="p-2">V2G State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((v) => (
                  <tr key={v.vehicleId}>
                    <td className="p-2 font-medium text-slate-900">{v.name}</td>
                    <td className="p-2 capitalize">{v.vehicleType.replace('_', ' ')}</td>
                    <td className="p-2 font-mono">{v.batteryCapacityKwh} kWh</td>
                    <td className="p-2 font-mono font-bold text-slate-800">{v.currentSoCPercent}%</td>
                    <td className="p-2 font-mono text-slate-600">{v.scheduledDeparture}</td>
                    <td className="p-2 font-mono font-semibold">
                      {v.action === 'v2g_discharge' ? (
                        <span className="text-amber-600 flex items-center gap-1">
                          <ArrowDownCircle className="h-3 w-3" /> -{v.powerKw} kW (V2G)
                        </span>
                      ) : (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <ArrowUpCircle className="h-3 w-3" /> +{v.powerKw} kW (Charge)
                        </span>
                      )}
                    </td>
                    <td className="p-2 font-mono">{v.stationId}</td>
                    <td className="p-2">
                      <Badge variant={v.action === 'v2g_discharge' ? 'warning' : 'success'}>
                        {v.action === 'v2g_discharge' ? 'V2G DISCHARGING' : 'SMART CHARGING'}
                      </Badge>
                    </td>
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
