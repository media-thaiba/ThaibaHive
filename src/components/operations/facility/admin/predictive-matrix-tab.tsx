import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VibrationSpectrogram } from '../diagnostics/vibration-spectrogram';
import { TelemetryChartViewer } from '../diagnostics/telemetry-chart-viewer';

interface PredictiveMatrixTabProps {
  alerts: any[];
  onTriageAlert?: (alertId: string, status: string) => void;
  onCreateWorkOrder?: (alertId: string) => void;
}

export function PredictiveMatrixTab({
  alerts = [],
  onTriageAlert,
  onCreateWorkOrder,
}: PredictiveMatrixTabProps) {
  const getSeverityVariant = (sev: string): 'destructive' | 'warning' | 'info' | 'secondary' => {
    if (sev === 'critical') return 'destructive';
    if (sev === 'high') return 'warning';
    if (sev === 'medium') return 'info';
    return 'secondary';
  };

  // Sample vibration spectrogram for top critical equipment
  const sampleHarmonics = [
    { frequencyHz: 29.8, amplitude: 2.65, harmonicOrder: 1.0, faultTag: '1X_UNBALANCE' },
    { frequencyHz: 59.6, amplitude: 1.12, harmonicOrder: 2.0 },
    { frequencyHz: 106.8, amplitude: 1.84, harmonicOrder: 3.58, faultTag: 'BPFO_OUTER_RACE' },
    { frequencyHz: 161.5, amplitude: 0.95, harmonicOrder: 5.42, faultTag: 'BPFI_INNER_RACE' },
  ];

  const sampleTelemetryPoints = [
    { timestamp: '10:00', value: 2.1 },
    { timestamp: '10:05', value: 2.3 },
    { timestamp: '10:10', value: 2.2 },
    { timestamp: '10:15', value: 3.4 },
    { timestamp: '10:20', value: 4.8 },
    { timestamp: '10:25', value: 5.6 },
  ];

  return (
    <div className="space-y-6">
      {/* ML Diagnostic Analyzers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VibrationSpectrogram
          equipmentName="Main Campus Chiller Motor - CHILLER-01"
          peakRms={4.85}
          dominantFrequencyHz={29.8}
          harmonicPeaks={sampleHarmonics}
          diagnosticNotes={[
            '1X Rotational Unbalance detected (amplitude 2.65 mm/s exceeds ISO Class II)',
            'BPFO Outer Race Bearing impact harmonic detected at 106.8 Hz',
            'Weibull RUL estimated at ~48 operating hours before catastrophic bearing seizure',
          ]}
        />

        <TelemetryChartViewer
          sensorId="SENSOR-CHILLER-VIB-01"
          sensorType="Vibration Velocity RMS"
          unit="mm/s"
          dataPoints={sampleTelemetryPoints}
          maxThreshold={4.5}
        />
      </div>

      {/* Anomaly Alerts Table */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold">Active Anomaly & Degradation Alerts</CardTitle>
            <div className="text-xs text-muted-foreground mt-0.5">
              Automated anomaly detection with Weibull RUL estimates & root cause hypotheses
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Alert ID</TableHead>
                <TableHead className="text-xs">Severity</TableHead>
                <TableHead className="text-xs">Equipment</TableHead>
                <TableHead className="text-xs">Predicted Failure Mode</TableHead>
                <TableHead className="text-xs">Anomaly Score</TableHead>
                <TableHead className="text-xs">Est. RUL</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((al) => (
                <TableRow key={al.id}>
                  <TableCell className="font-mono text-xs font-semibold">{al.alertId}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={getSeverityVariant(al.severity)} className="capitalize">
                      {al.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{al.equipmentId}</TableCell>
                  <TableCell className="text-xs max-w-xs truncate">{al.predictedFailureMode}</TableCell>
                  <TableCell className="text-xs font-mono font-bold">
                    {(al.anomalyScore * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell className="text-xs font-mono text-destructive font-semibold">
                    {al.estimatedRulHours ? `${al.estimatedRulHours}h` : 'N/A'}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="secondary" className="capitalize">
                      {al.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-right space-x-1">
                    {onCreateWorkOrder && al.status === 'open' && (
                      <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => onCreateWorkOrder(al.alertId)}>
                        Generate WO
                      </Button>
                    )}
                    {onTriageAlert && al.status === 'open' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onTriageAlert(al.alertId, 'triaged')}>
                        Triage
                      </Button>
                    )}
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
