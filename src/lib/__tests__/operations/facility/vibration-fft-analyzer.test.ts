import { VibrationFftAnalyzer } from '../../../operations/facility/predictive/models/vibration-fft-analyzer';
import { ThermalDegradationModel } from '../../../operations/facility/predictive/models/thermal-degradation-model';

describe('Vibration Spectral FFT & Thermal Degradation Diagnostic Models (Sprint-052 FACILITY-006)', () => {
  it('should detect 1X rotational unbalance and bearing outer race defect (BPFO)', () => {
    const samplingRate = 1000; // 1000 Hz
    const N = 128;
    const nominalRpm = 1800; // 1X = 30 Hz
    const runningFreqHz = 30;
    const bpfoFreqHz = 30 * 3.58; // ~107.4 Hz

    const rawSamples: number[] = [];
    for (let i = 0; i < N; i++) {
      const t = i / samplingRate;
      // Synthesize 1X unbalance signal (amplitude 2.5) + BPFO bearing fault spike (amplitude 1.8) + noise
      const unbalance = 2.5 * Math.sin(2 * Math.PI * runningFreqHz * t);
      const bearingFault = 1.8 * Math.sin(2 * Math.PI * bpfoFreqHz * t);
      const noise = (Math.random() - 0.5) * 0.2;
      rawSamples.push(unbalance + bearingFault + noise);
    }

    const result = VibrationFftAnalyzer.analyze('PUMP_CHW_01', 'VIB_SENSOR_01', rawSamples, samplingRate, nominalRpm);

    expect(result.mechanicalFaultDetected).toBe(true);
    expect(result.peakRms).toBeGreaterThan(1.5);
    expect(result.harmonicPeaks.length).toBeGreaterThan(0);
    expect(result.severity).not.toBe('low');
  });

  it('should evaluate chiller thermal degradation and detect condenser fouling', () => {
    // Healthy chiller: Supply 7°C, Return 12.5°C (deltaT = 5.5°C), Flow = 40 L/s, Power = 160 kW -> COP ≈ 5.75 (Healthy)
    const healthyResult = ThermalDegradationModel.evaluate('CHILLER-01', 7.0, 12.5, 40, 160, 5.8);
    expect(healthyResult.heatExchangeEfficiencyPercent).toBeGreaterThan(95);
    expect(healthyResult.severity).toBe('low');
    expect(healthyResult.foulingDetected).toBe(false);

    // Fouled chiller: Supply 7°C, Return 10.5°C (deltaT = 3.5°C), Flow = 40 L/s, Power = 160 kW -> COP ≈ 3.66 (Fouling)
    const fouledResult = ThermalDegradationModel.evaluate('CHILLER-01', 7.0, 10.5, 40, 160, 5.8);
    expect(fouledResult.heatExchangeEfficiencyPercent).toBeLessThan(80);
    expect(fouledResult.foulingDetected).toBe(true);
    expect(fouledResult.severity).toBe('high');
  });
});
