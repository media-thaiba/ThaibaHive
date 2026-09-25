import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Equipment3dMarker } from './equipment-3d-marker';
import { TwinEquipmentNode, TwinFloorMap } from './facility-twin-types';

interface TwinFacilityOverlayProps {
  floorMaps: TwinFloorMap[];
  onEquipmentClick?: (node: TwinEquipmentNode) => void;
}

export function TwinFacilityOverlay({ floorMaps = [], onEquipmentClick }: TwinFacilityOverlayProps) {
  const [selectedFloorIndex, setSelectedFloorIndex] = useState(0);
  const [selectedNode, setSelectedNode] = useState<TwinEquipmentNode | null>(null);

  const currentFloor = floorMaps[selectedFloorIndex] || {
    buildingId: 'bldg_eng',
    floorId: 'floor_basement',
    floorName: 'Engineering Complex - Basement MEP Level',
    equipmentNodes: [],
  };

  const handleNodeSelect = (node: TwinEquipmentNode) => {
    setSelectedNode(node);
    if (onEquipmentClick) onEquipmentClick(node);
  };

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/20 border-b">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span>Spatial Digital Twin 3D Viewport</span>
            <Badge variant="secondary" className="text-xs">
              {currentFloor.floorName}
            </Badge>
          </CardTitle>
          <div className="text-xs text-muted-foreground mt-0.5">
            Active BIM / MEP Spatial telemetry nodes ({currentFloor.equipmentNodes.length} units online)
          </div>
        </div>

        {/* Floor Level Selector */}
        <div className="flex items-center gap-1.5">
          {floorMaps.map((fm, idx) => (
            <Button
              key={fm.floorId}
              size="sm"
              variant={selectedFloorIndex === idx ? 'default' : 'outline'}
              className="text-xs h-7 px-2.5"
              onClick={() => {
                setSelectedFloorIndex(idx);
                setSelectedNode(null);
              }}
            >
              {fm.floorId.toUpperCase()}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0 relative">
        {/* Isometric 2.5D / 3D Grid Canvas Background */}
        <div className="h-80 w-full bg-slate-950 relative overflow-hidden flex items-center justify-center select-none border-b border-border">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#38bdf8 1px, #020617 1px)',
              backgroundSize: '30px 30px',
              backgroundPosition: '0 0, 15px 15px',
            }}
          />

          {/* Architectural CAD Blueprint Outline */}
          <div className="absolute inset-10 border-2 border-dashed border-sky-500/30 rounded-lg flex items-center justify-center">
            <div className="text-sky-500/20 font-mono text-sm tracking-widest uppercase">
              {currentFloor.floorName} &bull; MEP INFRASTRUCTURE MESH
            </div>
          </div>

          {/* Equipment Nodes Overlay */}
          {currentFloor.equipmentNodes.map((node) => (
            <Equipment3dMarker
              key={node.equipmentId}
              node={node}
              isSelected={selectedNode?.equipmentId === node.equipmentId}
              onSelect={handleNodeSelect}
            />
          ))}
        </div>

        {/* Selected Equipment Drawer Details */}
        {selectedNode && (
          <div className="p-3 bg-muted/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-foreground">{selectedNode.assetTag}</span>
              <span className="text-muted-foreground">{selectedNode.name}</span>
              <Badge variant={selectedNode.healthScore >= 80 ? 'success' : 'warning'}>
                Health: {selectedNode.healthScore}%
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                Coords: ({selectedNode.x}m, {selectedNode.y}m, {selectedNode.z}m)
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
