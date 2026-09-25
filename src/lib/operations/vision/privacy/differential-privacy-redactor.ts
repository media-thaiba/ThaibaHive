export class DifferentialPrivacyRedactor {
  /**
   * Sample from Laplace distribution for (epsilon)-differential privacy
   * PDF: f(x) = (1 / 2b) * exp(-|x| / b) where b = sensitivity / epsilon
   */
  public static sampleLaplaceNoise(sensitivity: number, epsilon: number): number {
    if (epsilon <= 0) epsilon = 1.0;
    const b = sensitivity / epsilon;
    const u = Math.random() - 0.5; // Uniform (-0.5, 0.5)
    const sign = u < 0 ? -1 : 1;
    return -b * sign * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * Apply DP noise to count queries (e.g. crowd headcount or hourly pedestrian volume)
   */
  public static privatizeCount(rawCount: number, epsilon: number = 1.0): number {
    const sensitivity = 1.0; // Adding or removing 1 individual changes count by at most 1
    const noise = this.sampleLaplaceNoise(sensitivity, epsilon);
    return Math.max(0, Math.round(rawCount + noise));
  }

  /**
   * Apply DP noise to density heatmaps
   */
  public static privatizeHeatmap(grid: number[][], epsilon: number = 1.0): number[][] {
    const gridEpsilon = epsilon / Math.max(grid.length * (grid[0]?.length || 1), 1);
    return grid.map((row) =>
      row.map((val) => {
        const noise = this.sampleLaplaceNoise(1.0, Math.max(0.1, gridEpsilon));
        return Math.max(0, Number((val + noise).toFixed(2)));
      })
    );
  }
}
