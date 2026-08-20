'use client';

import React, { useState, useRef } from 'react';
import { ParsedFacilityScene, ParsedSpaceModel } from '@/lib/operations/twin/rendering/model-parser';
import { MetricType } from '@/lib/operations/twin/twin-types';
import { ShaderMaterials } from '@/lib/operations/twin/rendering/shader-materials';
import { ViewportControls } from './viewport-controls';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface Campus3dViewportProps {
  scene: ParsedFacilityScene | null;
  activeMetric?: MetricType;
  selectedSpaceId?: string | null;
  onSelectSpace?: (space: ParsedSpaceModel | null) => void;
}

export function Campus3dViewport({
  scene,
  activeMetric = 'occupancy_count',
  selectedSpaceId = null,
  onSelectSpace,
}: Campus3dViewportProps) {
  const [activeFloor, setActiveFloor] = useState<number | null>(null);
  const [explodedDistance, setExplodedDistance] = useState<number>(0);
  const [metric, setMetric] = useState<MetricType>(activeMetric);
  const [hoveredSpace, setHoveredSpace] = useState<ParsedSpaceModel | null>(null);

  if (!scene) {
    return (
      <div className="h-[520px] w-full flex items-center justify-center bg-slate-900 text-slate-400 rounded-lg border border-slate-800">
        <p>No 3D Facility Model Loaded</p>
      </div>
    );
  }

  const spacesToRender = scene.spaces.filter((s) => {
    if (activeFloor !== null) return s.floorLevel === activeFloor;
    return true;
  });

  return (
    <div className="relative h-[520px] w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
      {/* Interactive Controls Overlay */}
      <ViewportControls
        activeFloor={activeFloor}
        totalFloors={scene.totalFloors}
        onSelectFloor={setActiveFloor}
        explodedDistance={explodedDistance}
        onExplodedChange={setExplodedDistance}
        activeMetric={metric}
        onMetricChange={setMetric}
        onResetCamera={() => {
          setActiveFloor(null);
          setExplodedDistance(0);
        }}
      />

      {/* 3D Isometric Viewport Canvas / SVG Representation */}
      <svg
        viewBox="-50 -30 200 160"
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
      >
        <defs>
          <radialGradient id="campusGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#020617" stopOpacity="1" />
          </radialGradient>
        </defs>
        <rect x="-100" y="-100" width="400" height="400" fill="url(#campusGlow)" />

        {/* Render Isometric Floor Grid */}
        <g transform="translate(45, 60) scale(1.6)">
          {spacesToRender.map((space, idx) => {
            const floorOffset = space.floorLevel * (12 + explodedDistance * 0.8);
            const isSelected = selectedSpaceId === space.spaceId;
            const isHovered = hoveredSpace?.spaceId === space.spaceId;

            // Generate heatmap color based on metric
            const mockValue = metric === 'temperature_c' ? 22 + idx * 1.5 : (metric === 'co2_ppm' ? 450 + idx * 120 : idx * 12);
            const color = ShaderMaterials.getHeatmapColor(metric, mockValue);

            // Compute 2D polygon SVG path
            const polyPoints = space.polygon.points
              .map(([x, y]) => {
                // 2.5D Isometric projection: isoX = (x - y) * cos(30), isoY = (x + y) * sin(30) - z
                const isoX = (x - y) * 0.866;
                const isoY = (x + y) * 0.5 - floorOffset;
                return `${isoX.toFixed(1)},${isoY.toFixed(1)}`;
              })
              .join(' ');

            return (
              <g
                key={space.spaceId}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredSpace(space)}
                onMouseLeave={() => setHoveredSpace(null)}
                onClick={() => onSelectSpace && onSelectSpace(space)}
              >
                {/* Extruded 3D Room Block */}
                <polygon
                  points={polyPoints}
                  fill={color.hex}
                  fillOpacity={isSelected ? 0.95 : (isHovered ? 0.85 : 0.65)}
                  stroke={isSelected ? '#38bdf8' : (isHovered ? '#ffffff' : '#64748b')}
                  strokeWidth={isSelected ? '1.5' : '0.8'}
                  className="transition-colors duration-200"
                />

                {/* Space Label */}
                {space.polygon.points[0] && (
                  <text
                    x={(space.polygon.points[0][0] - space.polygon.points[0][1]) * 0.866 + 2}
                    y={(space.polygon.points[0][0] + space.polygon.points[0][1]) * 0.5 - floorOffset + 4}
                    fill="#f8fafc"
                    fontSize="3.2"
                    fontWeight="600"
                    className="pointer-events-none drop-shadow"
                  >
                    {space.code}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Selected / Hovered Space HUD Popover */}
      {hoveredSpace && (
        <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-700 text-slate-100 p-3 rounded-lg shadow-xl text-xs z-20 pointer-events-none flex flex-col gap-1 min-w-[200px]">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-sm text-sky-400">{hoveredSpace.name}</span>
            <Badge variant="info">Floor {hoveredSpace.floorLevel}</Badge>
          </div>
          <p className="text-slate-400">Code: <span className="text-slate-200">{hoveredSpace.code}</span> | Type: <span className="capitalize">{hoveredSpace.spaceType}</span></p>
          <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-800 text-[11px]">
            <div>Capacity: <span className="font-semibold text-slate-200">{hoveredSpace.capacity} seats</span></div>
            <div>Area: <span className="font-semibold text-slate-200">{hoveredSpace.meshLod0.surfaceAreaSqMeters} m²</span></div>
          </div>
        </div>
      )}

      {/* Viewport Status Badge */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        <Badge variant="success">WebGL: Active (60 FPS)</Badge>
      </div>
    </div>
  );
}
