import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

interface HarmonicPeak {
  frequencyHz: number;
  amplitude: number;
  harmonicOrder: number;
  faultTag?: string;
}

interface VibrationSpectrogramProps {
  equipmentName: string;
  peakRms: number;
  dominantFrequencyHz: number;
  harmonicPeaks: HarmonicPeak[];
  diagnosticNotes: string[];
}

export function VibrationSpectrogram({
  equipmentName,
  peakRms,
  dominantFrequencyHz,
  harmonicPeaks = [],
  diagnosticNotes = [],
}: VibrationSpectrogramProps) {
  const maxAmp = harmonicPeaks.reduce((max, p) => Math.max(max, p.amplitude), 1.0);

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span>Spectral FFT Vibration Analyzer</span>
            <Badge variant={peakRms >= 4.5 ? 'destructive' : peakRms >= 2.8 ? 'warning' : 'success'}>
              RMS: {peakRms.toFixed(2)} mm/s
            </Badge>
          </CardTitle>
          <div className="text-xs text-muted-foreground mt-0.5">
            {equipmentName} &bull; Dominant Frequency: {dominantFrequencyHz.toFixed(1)} Hz
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Spectral Frequency Bar Visualizer */}
        <div className="h-28 w-full flex items-end gap-2 pt-2 pb-1 border-b border-border">
          {harmonicPeaks.map((peak, i) => {
            const heightPercent = Math.max(10, Math.min(100, (peak.amplitude / maxAmp) * 100));
            const isFault = !!peak.faultTag;

            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t transition-all ${
                    isFault ? 'bg-destructive' : 'bg-primary'
                  }`}
                />
                <span className="text-[10px] text-muted-foreground mt-1 truncate">
                  {peak.frequencyHz.toFixed(0)}Hz
                </span>
                <div className="hidden group-hover:block absolute bottom-full mb-1 z-10 bg-popover text-popover-foreground text-xs rounded p-1.5 shadow-md border whitespace-nowrap">
                  <div>Freq: {peak.frequencyHz.toFixed(1)} Hz ({peak.harmonicOrder}X)</div>
                  <div>Amp: {peak.amplitude.toFixed(3)} mm/s</div>
                  {peak.faultTag && <div className="text-destructive font-semibold">{peak.faultTag}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Harmonic Breakdown Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Frequency</TableHead>
              <TableHead className="text-xs">Order</TableHead>
              <TableHead className="text-xs">Velocity RMS</TableHead>
              <TableHead className="text-xs">Identified Fault Pattern</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {harmonicPeaks.map((p, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-mono text-xs">{p.frequencyHz.toFixed(1)} Hz</TableCell>
                <TableCell className="font-mono text-xs">{p.harmonicOrder}X RPM</TableCell>
                <TableCell className="font-mono text-xs">{p.amplitude.toFixed(3)} mm/s</TableCell>
                <TableCell className="text-xs">
                  {p.faultTag ? (
                    <Badge variant="destructive">{p.faultTag}</Badge>
                  ) : (
                    <Badge variant="secondary">Normal Spectrum</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Diagnostic Notes */}
        {diagnosticNotes.length > 0 && (
          <div className="bg-muted/40 p-2.5 rounded text-xs space-y-1">
            <div className="font-semibold text-foreground">Spectral Diagnostics:</div>
            {diagnosticNotes.map((note, idx) => (
              <div key={idx} className="text-muted-foreground flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {note}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
