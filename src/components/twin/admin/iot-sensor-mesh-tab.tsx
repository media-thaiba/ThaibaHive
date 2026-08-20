'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SensorRegistrationModal } from './sensor-registration-modal';
import { Radio, Plus, Battery, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export function IotSensorMeshTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sensors, setSensors] = useState([
    {
      sensorId: 'SEN-AIR-101',
      facilityId: 'Science Complex',
      spaceId: 'SEC-101',
      sensorType: 'co2',
      protocol: 'mqtt',
      status: 'online',
      batteryPercent: 94,
      healthGrade: 'A',
      lastHeartbeat: '12s ago',
    },
    {
      sensorId: 'SEN-TEMP-102',
      facilityId: 'Science Complex',
      spaceId: 'SEC-102',
      sensorType: 'temperature',
      protocol: 'coap',
      status: 'online',
      batteryPercent: 88,
      healthGrade: 'A',
      lastHeartbeat: '45s ago',
    },
    {
      sensorId: 'SEN-OCC-201',
      facilityId: 'Science Complex',
      spaceId: 'SEC-201',
      sensorType: 'occupancy_pir',
      protocol: 'mqtt',
      status: 'degraded',
      batteryPercent: 18,
      healthGrade: 'C',
      lastHeartbeat: '2m ago',
    },
    {
      sensorId: 'SEN-NOISE-202',
      facilityId: 'Science Complex',
      spaceId: 'SEC-202',
      sensorType: 'noise',
      protocol: 'mqtt',
      status: 'online',
      batteryPercent: 99,
      healthGrade: 'A',
      lastHeartbeat: '5s ago',
    },
  ]);

  const handleAddSensor = (data: any) => {
    setSensors((prev) => [
      ...prev,
      {
        ...data,
        status: 'online',
        batteryPercent: 100,
        healthGrade: 'A',
        lastHeartbeat: 'Just now',
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Radio className="h-4 w-4 text-sky-600" />
            Campus IoT Sensor Mesh Telemetry & Health Radar
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time monitoring of 1,200+ multi-protocol environmental and occupancy sensors
          </p>
        </div>
        <Button size="sm" className="gap-1 text-xs" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Register Sensor
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="p-3">Sensor ID</th>
                <th className="p-3">Facility & Space</th>
                <th className="p-3">Type</th>
                <th className="p-3">Protocol</th>
                <th className="p-3">Battery</th>
                <th className="p-3">Health Grade</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last Heartbeat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {sensors.map((s) => (
                <tr key={s.sensorId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-semibold text-slate-900">{s.sensorId}</td>
                  <td className="p-3 text-slate-600">{s.facilityId} - {s.spaceId}</td>
                  <td className="p-3 uppercase font-medium text-slate-700">{s.sensorType}</td>
                  <td className="p-3 uppercase text-slate-500 font-mono">{s.protocol}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <Battery className={`h-3.5 w-3.5 ${s.batteryPercent < 20 ? 'text-rose-500' : 'text-emerald-500'}`} />
                      <span className="font-medium">{s.batteryPercent}%</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[11px] font-bold ${
                      s.healthGrade === 'A' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {s.healthGrade}
                    </span>
                  </td>
                  <td className="p-3">
                    <Badge variant={s.status === 'online' ? 'success' : 'warning'}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-slate-500">{s.lastHeartbeat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <SensorRegistrationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRegister={handleAddSensor}
      />
    </div>
  );
}
