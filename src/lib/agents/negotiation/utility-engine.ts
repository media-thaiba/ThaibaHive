export class UtilityEngine {
  calculateParetoOptimal(options: any[], weights: Record<string, number>) {
    return options.map(opt => {
      let score = 0;
      for (const [key, weight] of Object.entries(weights)) {
        score += (opt[key] || 0) * weight;
      }
      return { ...opt, score };
    }).sort((a, b) => b.score - a.score);
  }
}