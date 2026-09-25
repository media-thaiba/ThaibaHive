import { PlateRegexValidator } from './plate-regex-validator';
import { VehicleEntryTracker } from './vehicle-entry-tracker';
import { AlprDetectionEvent } from '../vision-types';

export interface ProcessAlprFrameInput {
  cameraId: string;
  gateId: string;
  direction: 'entry' | 'exit';
  rawOcrText: string;
  ocrConfidence: number;
  vehicleType?: string;
  snapshotUrl?: string;
}

export class AlprOcrEngine {
  private entryTracker: VehicleEntryTracker;

  constructor(entryTracker?: VehicleEntryTracker) {
    this.entryTracker = entryTracker || new VehicleEntryTracker();
  }

  public processPlate(input: ProcessAlprFrameInput): {
    event: AlprDetectionEvent;
    isValidFormat: boolean;
    dwellMinutes?: number;
  } {
    const { isValid, normalizedPlate } = PlateRegexValidator.validateAndNormalize(input.rawOcrText);

    const { dwellMinutes } = this.entryTracker.recordMovement(
      normalizedPlate,
      input.direction,
      input.gateId
    );

    const event: AlprDetectionEvent = {
      logId: `alpr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      cameraId: input.cameraId,
      plateNumber: normalizedPlate,
      confidence: input.ocrConfidence,
      direction: input.direction,
      gateId: input.gateId,
      vehicleType: input.vehicleType || 'car',
      permitStatus: 'unknown',
      gateActuated: false,
      timestamp: new Date().toISOString(),
    };

    return { event, isValidFormat: isValid, dwellMinutes };
  }

  public getEntryTracker(): VehicleEntryTracker {
    return this.entryTracker;
  }
}
