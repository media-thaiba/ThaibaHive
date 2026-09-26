'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GeofenceDrawer } from './geofence-drawer';
import { Shield, Plus, MapPin, AlertOctagon } from 'lucide-react';

export function AssetRadarTab() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [assets] = useState([
    {
      assetId: 'AST-SPECTRO-01',
      tagId: 'BLE:AA:11:22',
      name: 'High-Precision Mass Spectrometer',
      category: 'lab_equipment',
      facility: 'Science Complex',
      space: 'SEC-101',
      status: 'in_place',
      lastSeen: '2m ago',
      value: '$85,000',
    },
    {
      assetId: 'AST-VR-HEADSET-04',
      tagId: 'BLE:BB:33:44',
      name: 'Vision Pro Spatial Testing Unit',
      category: 'it_hardware',
      facility: 'Science Complex',
      space: 'SEC-102',
      status: 'in_place',
      lastSeen: '1m ago',
      value: '$3,500',
    },
    {
      assetId: 'AST-ROBOT-ARM-01',
      tagId: 'BLE:CC:55:66',
      name: 'KUKA Collaborative Robot Arm',
      category: 'lab_equipment',
      facility: 'Science Complex',
      space: 'SEC-101',
      status: 'geofence_breach',
      lastSeen: 'Just now',
      value: '$42,000',
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="h-4 w-4 text-indigo-600" />
            Physical Asset RTLS Radar & Geofence Perimeter Security
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time BLE/RFID triangulation, perimeter breach alarms, and automated inventory tracking
          </p>
        </div>
        <Button size="sm" className="gap-1 text-xs" onClick={() => setIsDrawerOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Geofence
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="p-3">Asset ID / Tag</th>
                <th className="p-3">Equipment Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Current Location</th>
                <th className="p-3">Book Value</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {assets.map((a) => (
                <tr key={a.assetId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3">
                    <div className="font-semibold text-slate-900">{a.assetId}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{a.tagId}</div>
                  </td>
                  <td className="p-3 font-medium text-slate-900">{a.name}</td>
                  <td className="p-3 capitalize text-slate-600">{a.category.replace('_', ' ')}</td>
                  <td className="p-3 text-slate-700 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {a.facility} ({a.space})
                  </td>
                  <td className="p-3 font-semibold text-slate-900">{a.value}</td>
                  <td className="p-3">
                    <Badge variant={a.status === 'in_place' ? 'success' : 'destructive'} className="gap-1">
                      {a.status === 'geofence_breach' && <AlertOctagon className="h-3 w-3" />}
                      {a.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="p-3 text-slate-500">{a.lastSeen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <GeofenceDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSave={() => {}}
      />
    </div>
  );
}
