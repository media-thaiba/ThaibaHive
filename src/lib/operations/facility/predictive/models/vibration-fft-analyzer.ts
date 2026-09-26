import { VibrationFftResult, FftPeakHarmonic } from '../predictive-types';
import { AnomalySeverity } from '../../facility-types';

export class VibrationFftAnalyzer {
  /**
   * Performs spectral FFT analysis on time-series vibration samples.
   * @param rawSamples Array of acceleration / velocity values (time domain)
   * @param samplingRateHz Sampling frequency (e.g. 1000 Hz or 5000 Hz)
   * @param nominalRpm Equipment running speed (e.g. 1750 RPM = 29.17 Hz)
   */
  public static analyze(
    equipmentId: string,
    sensorId: string,
    rawSamples: number[],
    samplingRateHz: number = 1000,
    nominalRpm: number = 1800
  ): VibrationFftResult {
    const N = rawSamples.length;
    if (N === 0) {
      return {
        equipmentId,
        sensorId,
        dominantFrequencyHz: 0,
        peakRms: 0,
        harmonicPeaks: [],
        severity: 'low',
        mechanicalFaultDetected: false,
        diagnosticNotes: ['No vibration samples provided'],
      };
    }

    // 1. Calculate Peak RMS
    const sumSquares = rawSamples.reduce((acc, v) => acc + v * v, 0);
    const peakRms = Number(Math.sqrt(sumSquares / N).toFixed(3));

    // 2. Perform DFT (Discrete Fourier Transform) over frequency spectrum
    const runningFreqHz = nominalRpm / 60; // 1X Running Speed Frequency in Hz (e.g., 30 Hz for 1800 RPM)
    const numBins = Math.min(64, Math.floor(N / 2));
    const magnitudes: { freq: number; mag: number }[] = [];

    for (let k = 1; k < numBins; k++) {
      let real = 0;
      let imag = 0;
      const freq = (k * samplingRateHz) / N;

      for (let n = 0; n < N; n++) {
        const angle = (2 * Math.PI * k * n) / N;
        real += rawSamples[n] * Math.cos(angle);
        imag -= rawSamples[n] * Math.sin(angle);
      }

      const mag = (2 * Math.sqrt(real * real + imag * imag)) / N;
      magnitudes.push({ freq, mag });
    }

    // 3. Find top peak harmonics
    magnitudes.sort((a, b) => b.mag - a.mag);
    const topPeaks = magnitudes.slice(0, 5);

    const harmonicPeaks: FftPeakHarmonic[] = [];
    const diagnosticNotes: string[] = [];
    let mechanicalFaultDetected = false;
    let severity: AnomalySeverity = 'low';

    // Bearing fault multiplier constants (typical deep groove ball bearing)
    const bpfoMultiplier = 3.58; // Outer race
    const bpfiMultiplier = 5.42; // Inner race

    for (let i = 0; i < topPeaks.length; i++) {
      const peak = topPeaks[i];
      const ratio = peak.freq / (runningFreqHz || 1);
      let faultTag: string | undefined;

      // 1X Unbalance: Peak exactly at 1.0X running speed
      if (Math.abs(ratio - 1.0) < 0.15 && peak.mag > 1.5) {
        faultTag = '1X_UNBALANCE';
        diagnosticNotes.push(`Rotational Unbalance (1X): Peak ${peak.mag.toFixed(2)} mm/s at ${peak.freq.toFixed(1)} Hz`);
        mechanicalFaultDetected = true;
      }
      // 2X Misalignment: Peak at 2.0X running speed
      else if (Math.abs(ratio - 2.0) < 0.15 && peak.mag > 1.2) {
        faultTag = '2X_MISALIGNMENT';
        diagnosticNotes.push(`Shaft Misalignment (2X): Peak ${peak.mag.toFixed(2)} mm/s at ${peak.freq.toFixed(1)} Hz`);
        mechanicalFaultDetected = true;
      }
      // BPFO: Outer Race Bearing Defect
      else if (Math.abs(ratio - bpfoMultiplier) < 0.25 && peak.mag > 0.8) {
        faultTag = 'BPFO_OUTER_RACE';
        diagnosticNotes.push(`Bearing Outer Race Defect (BPFO): Harmonic at ${peak.freq.toFixed(1)} Hz (${ratio.toFixed(2)}X RPM)`);
        mechanicalFaultDetected = true;
      }
      // BPFI: Inner Race Bearing Defect
      else if (Math.abs(ratio - bpfiMultiplier) < 0.25 && peak.mag > 0.8) {
        faultTag = 'BPFI_INNER_RACE';
        diagnosticNotes.push(`Bearing Inner Race Defect (BPFI): Harmonic at ${peak.freq.toFixed(1)} Hz (${ratio.toFixed(2)}X RPM)`);
        mechanicalFaultDetected = true;
      }

      harmonicPeaks.push({
        frequencyHz: Number(peak.freq.toFixed(2)),
        amplitude: Number(peak.mag.toFixed(4)),
        harmonicOrder: Number(ratio.toFixed(2)),
        faultTag,
      });
    }

    // Determine overall vibration severity (ISO 10816-3 standards: <2.8 Good, 2.8-4.5 Warning, >4.5 Critical)
    if (peakRms >= 4.5 || (mechanicalFaultDetected && peakRms >= 3.5)) {
      severity = 'critical';
    } else if (peakRms >= 2.8 || mechanicalFaultDetected) {
      severity = 'high';
    } else if (peakRms >= 1.8) {
      severity = 'medium';
    }

    const dominantFreq = topPeaks.length > 0 ? Number(topPeaks[0].freq.toFixed(2)) : 0;

    return {
      equipmentId,
      sensorId,
      dominantFrequencyHz: dominantFreq,
      peakRms,
      harmonicPeaks,
      severity,
      mechanicalFaultDetected,
      diagnosticNotes: diagnosticNotes.length > 0 ? diagnosticNotes : ['Vibration levels within ISO 10816 Class II permissible limits'],
    };
  }
}
