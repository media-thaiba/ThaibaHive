'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Campus3dExplorerTab } from '@/components/twin/admin/campus-3d-explorer-tab';
import { SpaceOptimizationTab } from '@/components/twin/admin/space-optimization-tab';
import { IotSensorMeshTab } from '@/components/twin/admin/iot-sensor-mesh-tab';
import { AssetRadarTab } from '@/components/twin/admin/asset-radar-tab';
import { EmergencySimulatorTab } from '@/components/twin/admin/emergency-simulator-tab';
import { Box, Sliders, Radio, Shield, Flame } from 'lucide-react';

export default function DigitalTwinRadarPage() {
  const [activeTab, setActiveTab] = useState('3d-explorer');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Autonomous Campus Digital Twin & Spatial Facility Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time 3D spatial awareness, IoT sensor telemetry mesh, predictive space ML, and RTLS asset tracking
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="success">Digital Twin: Active</Badge>
          <Badge variant="info">v3.32.0 SpatialGrid</Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-4xl">
          <TabsTrigger value="3d-explorer" className="flex items-center gap-1.5">
            <Box className="h-4 w-4" />
            3D Campus Explorer
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center gap-1.5">
            <Sliders className="h-4 w-4" />
            Space Optimization
          </TabsTrigger>
          <TabsTrigger value="iot-mesh" className="flex items-center gap-1.5">
            <Radio className="h-4 w-4" />
            IoT Sensor Mesh
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            Asset Radar
          </TabsTrigger>
          <TabsTrigger value="emergency" className="flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-rose-500" />
            Emergency Simulator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="3d-explorer">
          <Campus3dExplorerTab />
        </TabsContent>

        <TabsContent value="optimization">
          <SpaceOptimizationTab />
        </TabsContent>

        <TabsContent value="iot-mesh">
          <IotSensorMeshTab />
        </TabsContent>

        <TabsContent value="assets">
          <AssetRadarTab />
        </TabsContent>

        <TabsContent value="emergency">
          <EmergencySimulatorTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
