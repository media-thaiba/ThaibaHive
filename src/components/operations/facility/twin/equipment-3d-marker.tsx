import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TwinEquipmentNode } from './facility-twin-types';

interface Equipment3dMarkerProps {
  node: TwinEquipmentNode;
  isSelected?: boolean;
  onSelect: (node: TwinEquipmentNode) => void;
}

export function Equipment3dMarker({ node, isSelected = false, onSelect }: Equipment3dMarkerProps) {
  const getStatusColor = (st: string) => {
    if (st === 'operational') return 'bg-emerald-500 border-emerald-300 ring-emerald-400';
    if (st === 'degraded') return 'bg-amber-500 border-amber-300 ring-amber-400 animate-pulse';
    if (st === 'offline') return 'bg-rose-500 border-rose-300 ring-rose-400 animate-ping';
    return 'bg-blue-500 border-blue-300 ring-blue-400';
  };

  return (
    <div
      style={{ left: `${node.x}%`, top: `${node.y}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10"
      onClick={() => onSelect(node)}
    >
      {/* 3D Pulse Beacon */}
      <div
        className={`w-5 h-5 rounded-full border-2 shadow-lg transition-transform transform ${
          isSelected ? 'scale-125 ring-4' : 'group-hover:scale-110 ring-2'
        } ${getStatusColor(node.status)}`}
      />

      {/* Floating Info Tooltip */}
      <div className="hidden group-hover:flex flex-col absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-popover text-popover-foreground text-xs rounded p-2 shadow-xl border whitespace-nowrap z-30 pointer-events-none">
        <div className="font-semibold">{node.assetTag}</div>
        <div className="text-[11px] text-muted-foreground">{node.name}</div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={node.healthScore >= 80 ? 'success' : 'warning'} className="text-[9px]">
            Health: {node.healthScore.toFixed(0)}%
          </Badge>
          {node.activeAlertCount > 0 && (
            <Badge variant="destructive" className="text-[9px]">
              {node.activeAlertCount} Alert(s)
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
