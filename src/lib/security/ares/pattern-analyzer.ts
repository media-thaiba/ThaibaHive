/**
 * Historical Incident Pattern Analyzer
 * Sprint-042 (ARES) — ARES-002
 */

import { ThreatCategory } from './ares-types';

export interface IncidentPatternRecord {
  incidentId: string;
  category: ThreatCategory;
  mitreTactic: string;
  mitreTechnique: string;
  timestamp: string;
  durationMinutes: number;
  severity: string;
}

export interface TransitionProbability {
  fromTechnique: string;
  toTechnique: string;
  probability: number;
  sampleCount: number;
}

export interface PatternAnalysisReport {
  totalIncidentsAnalyzed: number;
  topTechniques: { technique: string; count: number }[];
  transitionMatrix: TransitionProbability[];
  averageProgressionTimeHours: number;
  analyzedAt: string;
}

export class PatternAnalyzer {
  private static instance: PatternAnalyzer | null = null;
  private incidentHistory: IncidentPatternRecord[] = [];

  private constructor() {}

  public static getInstance(): PatternAnalyzer {
    if (!PatternAnalyzer.instance) {
      PatternAnalyzer.instance = new PatternAnalyzer();
    }
    return PatternAnalyzer.instance;
  }

  public static resetInstance(): void {
    PatternAnalyzer.instance = null;
  }

  public recordIncident(incident: IncidentPatternRecord): void {
    this.incidentHistory.push(incident);
  }

  public recordIncidents(incidents: IncidentPatternRecord[]): void {
    this.incidentHistory.push(...incidents);
  }

  public analyzePatterns(): PatternAnalysisReport {
    if (this.incidentHistory.length === 0) {
      return {
        totalIncidentsAnalyzed: 0,
        topTechniques: [],
        transitionMatrix: [],
        averageProgressionTimeHours: 0,
        analyzedAt: new Date().toISOString(),
      };
    }

    // Calculate technique frequencies
    const techniqueCounts = new Map<string, number>();
    for (const inc of this.incidentHistory) {
      techniqueCounts.set(inc.mitreTechnique, (techniqueCounts.get(inc.mitreTechnique) || 0) + 1);
    }

    const topTechniques = Array.from(techniqueCounts.entries())
      .map(([technique, count]) => ({ technique, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate transitions between chronological steps
    const transitions = new Map<string, number>();
    const fromCounts = new Map<string, number>();

    const sorted = [...this.incidentHistory].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i].mitreTechnique;
      const to = sorted[i + 1].mitreTechnique;
      const key = `${from}->${to}`;

      transitions.set(key, (transitions.get(key) || 0) + 1);
      fromCounts.set(from, (fromCounts.get(from) || 0) + 1);
    }

    const transitionMatrix: TransitionProbability[] = [];
    for (const [key, count] of transitions.entries()) {
      const [fromTechnique, toTechnique] = key.split('->');
      const totalFrom = fromCounts.get(fromTechnique) || count;
      transitionMatrix.push({
        fromTechnique,
        toTechnique,
        probability: Number((count / totalFrom).toFixed(4)),
        sampleCount: count,
      });
    }

    const avgDuration =
      this.incidentHistory.reduce((acc, curr) => acc + (curr.durationMinutes || 30), 0) /
      this.incidentHistory.length /
      60;

    return {
      totalIncidentsAnalyzed: this.incidentHistory.length,
      topTechniques,
      transitionMatrix,
      averageProgressionTimeHours: Number(avgDuration.toFixed(2)),
      analyzedAt: new Date().toISOString(),
    };
  }

  public predictNextTactics(currentTechnique: string): TransitionProbability[] {
    const report = this.analyzePatterns();
    return report.transitionMatrix
      .filter((t) => t.fromTechnique === currentTechnique)
      .sort((a, b) => b.probability - a.probability);
  }
}
