'use client';

import React, { useState, useEffect } from 'react';
import { Campus3dViewport } from '../campus-3d-viewport';
import { BuildingTelemetrySidebar } from './building-telemetry-sidebar';
import { ModelParser, ParsedFacilityScene, ParsedSpaceModel } from '@/lib/operations/twin/rendering/model-parser';
import { Button } from '@/components/ui/button';
import { Building, RefreshCw } from 'lucide-react';

export function Campus3dExplorerTab() {
  const [scene, setScene] = useState<ParsedFacilityScene | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<ParsedSpaceModel | null>(null);
  const [_isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    // Generate default multi-building demo scene
    const defaultScene = ModelParser.parseGeoJsonFacility('FAC-CAMPUS-MAIN', {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { spaceId: 'SEC-101', name: 'Robotics & AI Studio', code: 'SEC-101', floorLevel: 1, spaceType: 'laboratory', capacity: 35 },
          geometry: { type: 'Polygon', coordinates: [[[0, 0], [25, 0], [25, 18], [0, 18], [0, 0]]] },
        },
        {
          type: 'Feature',
          properties: { spaceId: 'SEC-102', name: 'Biotech Research Lab', code: 'SEC-102', floorLevel: 1, spaceType: 'laboratory', capacity: 25 },
          geometry: { type: 'Polygon', coordinates: [[[25, 0], [45, 0], [45, 18], [25, 18], [25, 0]]] },
        },
        {
          type: 'Feature',
          properties: { spaceId: 'SEC-201', name: 'Executive Lecture Hall', code: 'SEC-201', floorLevel: 2, spaceType: 'auditorium', capacity: 150 },
          geometry: { type: 'Polygon', coordinates: [[[0, 0], [30, 0], [30, 20], [0, 20], [0, 0]]] },
        },
        {
          type: 'Feature',
          properties: { spaceId: 'SEC-202', name: 'Collaborative Seminar', code: 'SEC-202', floorLevel: 2, spaceType: 'classroom', capacity: 40 },
          geometry: { type: 'Polygon', coordinates: [[[30, 0], [45, 0], [45, 20], [30, 20], [30, 0]]] },
        },
      ],
    });
    setScene(defaultScene);
    setIsLoading(false);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-slate-700" />
            <span className="font-semibold text-slate-900 text-sm">Science & Engineering Complex (SEC)</span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setSelectedSpace(null)}>
            <RefreshCw className="h-3 w-3" /> Clear Selection
          </Button>
        </div>

        <Campus3dViewport
          scene={scene}
          selectedSpaceId={selectedSpace?.spaceId}
          onSelectSpace={setSelectedSpace}
        />
      </div>

      <div>
        <BuildingTelemetrySidebar
          selectedSpace={selectedSpace}
          facilityName="Science Complex"
        />
      </div>
    </div>
  );
}
