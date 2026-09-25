import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EquipmentHealthGauge } from '../diagnostics/equipment-health-gauge';
import { TwinFacilityOverlay } from '../twin/twin-facility-overlay';
import { TwinFloorMap } from '../twin/facility-twin-types';

interface EquipmentStudioTabProps {
  equipmentList: any[];
  floorMaps: TwinFloorMap[];
  onAddEquipment?: () => void;
}

export function EquipmentStudioTab({
  equipmentList = [],
  floorMaps = [],
  onAddEquipment,
}: EquipmentStudioTabProps) {
  const getStatusVariant = (st: string): 'success' | 'warning' | 'destructive' | 'secondary' => {
    if (st === 'operational') return 'success';
    if (st === 'degraded') return 'warning';
    if (st === 'offline') return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* 3D Digital Twin Viewport */}
      <TwinFacilityOverlay floorMaps={floorMaps} />

      {/* Equipment KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {equipmentList.slice(0, 3).map((item) => (
          <EquipmentHealthGauge
            key={item.id}
            healthScore={item.healthScore ?? 100}
            equipmentName={item.name}
            assetTag={item.assetTag}
            category={item.category}
            status={item.status}
          />
        ))}
      </div>

      {/* Equipment Asset Roster Table */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold">Campus Infrastructure Assets</CardTitle>
            <div className="text-xs text-muted-foreground mt-0.5">
              Comprehensive telemetry status across mechanical, electrical, and HVAC equipment
            </div>
          </div>
          {onAddEquipment && (
            <Button size="sm" onClick={onAddEquipment}>
              + Register Asset
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Asset Tag</TableHead>
                <TableHead className="text-xs">Name / Specification</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Location</TableHead>
                <TableHead className="text-xs">Health Score</TableHead>
                <TableHead className="text-xs">Operational Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipmentList.map((eq) => (
                <TableRow key={eq.id}>
                  <TableCell className="font-mono text-xs font-semibold">{eq.assetTag}</TableCell>
                  <TableCell className="text-xs font-medium">{eq.name}</TableCell>
                  <TableCell className="text-xs capitalize">{eq.category}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {eq.buildingId} &bull; {eq.floorId} {eq.roomId ? `(${eq.roomId})` : ''}
                  </TableCell>
                  <TableCell className="text-xs font-mono font-bold">
                    {(eq.healthScore ?? 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={getStatusVariant(eq.status)} className="capitalize">
                      {eq.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
