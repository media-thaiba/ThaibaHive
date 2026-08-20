/**
 * Unit tests for PatternAnalyzer (ARES-002)
 */

import { PatternAnalyzer, IncidentPatternRecord } from '@/lib/security/ares/pattern-analyzer';

describe('ARES-002: PatternAnalyzer', () => {
  beforeEach(() => {
    PatternAnalyzer.resetInstance();
  });

  it('should handle empty incident history gracefully', () => {
    const analyzer = PatternAnalyzer.getInstance();
    const report = analyzer.analyzePatterns();

    expect(report.totalIncidentsAnalyzed).toBe(0);
    expect(report.topTechniques).toEqual([]);
    expect(report.transitionMatrix).toEqual([]);
  });

  it('should correctly calculate MITRE ATT&CK technique frequencies and transition probabilities', () => {
    const analyzer = PatternAnalyzer.getInstance();
    const mockIncidents: IncidentPatternRecord[] = [
      {
        incidentId: 'inc-1',
        category: 'CREDENTIAL_STUFFING',
        mitreTactic: 'Initial Access',
        mitreTechnique: 'T1110',
        timestamp: '2026-08-01T10:00:00Z',
        durationMinutes: 15,
        severity: 'HIGH',
      },
      {
        incidentId: 'inc-2',
        category: 'LATERAL_MOVEMENT',
        mitreTactic: 'Lateral Movement',
        mitreTechnique: 'T1021',
        timestamp: '2026-08-01T10:20:00Z',
        durationMinutes: 25,
        severity: 'HIGH',
      },
      {
        incidentId: 'inc-3',
        category: 'DATA_EXFILTRATION',
        mitreTactic: 'Exfiltration',
        mitreTechnique: 'T1048',
        timestamp: '2026-08-01T11:00:00Z',
        durationMinutes: 40,
        severity: 'CRITICAL',
      },
    ];

    analyzer.recordIncidents(mockIncidents);
    const report = analyzer.analyzePatterns();

    expect(report.totalIncidentsAnalyzed).toBe(3);
    expect(report.topTechniques.length).toBe(3);
    expect(report.transitionMatrix.length).toBe(2);

    const nextFromT1110 = analyzer.predictNextTactics('T1110');
    expect(nextFromT1110.length).toBe(1);
    expect(nextFromT1110[0].toTechnique).toBe('T1021');
    expect(nextFromT1110[0].probability).toBe(1.0);
  });
});
