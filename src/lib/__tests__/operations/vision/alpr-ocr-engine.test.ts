import { AlprOcrEngine } from '../../../operations/vision/alpr/alpr-ocr-engine';

describe('AlprOcrEngine License Plate Recognition & Entry Tracking', () => {
  let engine: AlprOcrEngine;

  beforeEach(() => {
    engine = new AlprOcrEngine();
  });

  it('should normalize and recognize standard plate strings', () => {
    const result = engine.processPlate({
      cameraId: 'cam_gate_in',
      gateId: 'main_gate',
      direction: 'entry',
      rawOcrText: '  ka-01-ab-1234 ',
      ocrConfidence: 0.96,
      vehicleType: 'car',
    });

    expect(result.isValidFormat).toBe(true);
    expect(result.event.plateNumber).toBe('KA01AB1234');
    expect(result.event.direction).toBe('entry');
    expect(engine.getEntryTracker().isVehicleOnCampus('KA01AB1234')).toBe(true);
  });

  it('should track vehicle entry and exit to calculate dwell time', () => {
    // Record Entry
    engine.processPlate({
      cameraId: 'cam_gate_in',
      gateId: 'main_gate',
      direction: 'entry',
      rawOcrText: 'ABC-5678',
      ocrConfidence: 0.95,
    });

    // Record Exit
    const exitResult = engine.processPlate({
      cameraId: 'cam_gate_out',
      gateId: 'exit_gate',
      direction: 'exit',
      rawOcrText: 'ABC-5678',
      ocrConfidence: 0.97,
    });

    expect(exitResult.event.direction).toBe('exit');
    expect(exitResult.dwellMinutes).toBeDefined();
    expect(engine.getEntryTracker().isVehicleOnCampus('ABC5678')).toBe(false);
  });
});
