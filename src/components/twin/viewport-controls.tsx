'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MetricType } from '@/lib/operations/twin/twin-types';
import { Layers, ZoomIn, ZoomOut, RotateCcw, Thermometer, Wind, Volume2, Users } from 'lucide-react';

interface ViewportControlsProps {
  activeFloor: number | null;
  totalFloors: number;
  onSelectFloor: (floor: number | null) => void;
  explodedDistance: number;
  onExplodedChange: (dist: number) => void;
  activeMetric: MetricType;
  onMetricChange: (metric: MetricType) => void;
  onResetCamera: () => void;
}

export function ViewportControls({
  activeFloor,
  totalFloors,
  onSelectFloor,
  explodedDistance,
  onExplodedChange,
  activeMetric,
  onMetricChange,
  onResetCamera,
}: ViewportControlsProps) {
  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 bg-white/95 backdrop-blur shadow-md rounded-lg p-2.5 border border-slate-200 text-xs">
      {/* Floor Selector */}
      <div className="flex items-center gap-1">
        <span className="font-semibold text-slate-700 mr-1 flex items-center gap-1">
          <Layers className="h-3.5 w-3.5" /> Floor:
        </span>
        <Button
          size="sm"
          variant={activeFloor === null ? 'default' : 'outline'}
          className="h-6 px-2 text-xs"
          onClick={() => onSelectFloor(null)}
        >
          All
        </Button>
        {Array.from({ length: totalFloors }, (_, i) => (
          <Button
            key={i}
            size="sm"
            variant={activeFloor === i ? 'default' : 'outline'}
            className="h-6 px-2 text-xs"
            onClick={() => onSelectFloor(i)}
          >
            F{i}
          </Button>
        ))}
      </div>

      {/* Exploded View Slider */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        <span className="text-slate-600 font-medium">Explode:</span>
        <input
          type="range"
          min="0"
          max="30"
          value={explodedDistance}
          onChange={(e) => onExplodedChange(Number(e.target.value))}
          className="w-24 h-1.5 bg-slate-200 rounded cursor-pointer"
        />
        <span className="text-slate-500">{explodedDistance}m</span>
      </div>

      {/* Metric Overlay Filter */}
      <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
        <span className="text-slate-600 font-medium mr-1">Layer:</span>
        <Button
          size="sm"
          variant={activeMetric === 'occupancy_count' ? 'default' : 'outline'}
          className="h-6 px-1.5 text-xs gap-1"
          onClick={() => onMetricChange('occupancy_count')}
        >
          <Users className="h-3 w-3" /> Occ
        </Button>
        <Button
          size="sm"
          variant={activeMetric === 'temperature_c' ? 'default' : 'outline'}
          className="h-6 px-1.5 text-xs gap-1"
          onClick={() => onMetricChange('temperature_c')}
        >
          <Thermometer className="h-3 w-3" /> Temp
        </Button>
        <Button
          size="sm"
          variant={activeMetric === 'co2_ppm' ? 'default' : 'outline'}
          className="h-6 px-1.5 text-xs gap-1"
          onClick={() => onMetricChange('co2_ppm')}
        >
          <Wind className="h-3 w-3" /> Air
        </Button>
        <Button
          size="sm"
          variant={activeMetric === 'noise_db' ? 'default' : 'outline'}
          className="h-6 px-1.5 text-xs gap-1"
          onClick={() => onMetricChange('noise_db')}
        >
          <Volume2 className="h-3 w-3" /> Noise
        </Button>
      </div>

      {/* Camera Reset */}
      <div className="pt-1 border-t border-slate-100 flex justify-end">
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1" onClick={onResetCamera}>
          <RotateCcw className="h-3 w-3" /> Reset View
        </Button>
      </div>
    </div>
  );
}
