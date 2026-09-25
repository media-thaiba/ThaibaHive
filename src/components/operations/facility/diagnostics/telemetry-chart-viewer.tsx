import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TelemetryPoint {
  timestamp: string;
  value: number;
}

interface TelemetryChartViewerProps {
  sensorId: string;
  sensorType: string;
  unit: string;
  dataPoints: TelemetryPoint[];
  minThreshold?: number;
  maxThreshold?: number;
}

export function TelemetryChartViewer({
  sensorId,
  sensorType,
  unit,
  dataPoints = [],
  minThreshold,
  maxThreshold,
}: TelemetryChartViewerProps) {
  const values = dataPoints.map((d) => d.value);
  const minVal = values.length > 0 ? Math.min(...values, minThreshold ?? values[0]) : 0;
  const maxVal = values.length > 0 ? Math.max(...values, maxThreshold ?? values[0]) : 100;
  const range = maxVal - minVal || 1;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span>{sensorId}</span>
            <Badge variant="secondary" className="capitalize text-xs">
              {sensorType} ({unit})
            </Badge>
          </CardTitle>
          <div className="text-xs text-muted-foreground mt-0.5">
            Real-time rolling telemetry stream
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold font-mono">
            {values.length > 0 ? values[values.length - 1].toFixed(2) : '--'} {unit}
          </div>
          <div className="text-xs text-muted-foreground">Current Reading</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-36 w-full flex items-end gap-1.5 pt-4 pb-2 border-b border-border">
          {dataPoints.map((dp, idx) => {
            const heightPercent = Math.max(8, Math.min(100, ((dp.value - minVal) / range) * 100));
            const isBreach = (maxThreshold && dp.value > maxThreshold) || (minThreshold && dp.value < minThreshold);

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t transition-all duration-300 ${
                    isBreach ? 'bg-destructive' : 'bg-primary/80 hover:bg-primary'
                  }`}
                />
                <div className="hidden group-hover:block absolute bottom-full mb-1 z-10 bg-popover text-popover-foreground text-xs rounded px-1.5 py-0.5 shadow-md border whitespace-nowrap">
                  {dp.value.toFixed(2)} {unit}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
          <span>Min: {minVal.toFixed(1)} {unit}</span>
          {typeof maxThreshold === 'number' && (
            <span className="text-destructive font-medium">Upper Threshold: {maxThreshold} {unit}</span>
          )}
          <span>Max: {maxVal.toFixed(1)} {unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}
