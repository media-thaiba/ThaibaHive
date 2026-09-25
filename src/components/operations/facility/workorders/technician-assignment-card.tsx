import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface RankedTechnician {
  technicianId: string;
  name: string;
  specializations: string[];
  currentBuildingId: string;
  currentFloorId: string;
  distanceMeters: number;
  activeCaseload: number;
  compositeRankScore: number;
}

interface TechnicianAssignmentCardProps {
  technician: RankedTechnician;
  isSelected?: boolean;
  onSelect: (techId: string) => void;
}

export function TechnicianAssignmentCard({
  technician,
  isSelected = false,
  onSelect,
}: TechnicianAssignmentCardProps) {
  return (
    <Card
      className={`border transition-all cursor-pointer ${
        isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'
      }`}
      onClick={() => onSelect(technician.technicianId)}
    >
      <CardContent className="p-3.5 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground">{technician.name}</span>
            <Badge variant="secondary" className="text-[10px]">
              Rank: {(technician.compositeRankScore * 100).toFixed(0)}%
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Loc: {technician.currentBuildingId} &bull; {technician.currentFloorId} &bull;{' '}
            <span className="font-medium text-foreground">{technician.distanceMeters}m away</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            {technician.specializations.map((spec, i) => (
              <Badge key={i} variant="outline" className="text-[10px] uppercase">
                {spec}
              </Badge>
            ))}
            <span className="text-[10px] text-muted-foreground ml-2">
              Active tickets: {technician.activeCaseload}
            </span>
          </div>
        </div>

        <Button
          size="sm"
          variant={isSelected ? 'default' : 'outline'}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(technician.technicianId);
          }}
        >
          {isSelected ? 'Selected' : 'Assign'}
        </Button>
      </CardContent>
    </Card>
  );
}
