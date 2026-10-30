import {
  projectMomentum,
  calculateRubberBand,
  resolveNearestSnapPoint,
  shouldDismissSheet,
} from "../sheet-physics";

describe("Apple Fluid Interface Sheet Physics", () => {
  describe("projectMomentum", () => {
    it("returns 0 for zero velocity", () => {
      expect(projectMomentum(0)).toBe(0);
    });

    it("projects forward travel proportional to velocity", () => {
      const v = 1000; // 1000 px/s
      // (1000/1000) * 0.998 / (1 - 0.998) = 1 * 0.998 / 0.002 = 499 px
      const projected = projectMomentum(v);
      expect(Math.round(projected)).toBe(499);
    });

    it("projects negative distance for upward flick", () => {
      const v = -800;
      const projected = projectMomentum(v);
      expect(projected).toBeLessThan(0);
      expect(Math.round(projected)).toBe(-399);
    });
  });

  describe("calculateRubberBand", () => {
    it("returns 0 for zero overshoot or invalid dimension", () => {
      expect(calculateRubberBand(0, 500)).toBe(0);
      expect(calculateRubberBand(50, 0)).toBe(0);
      expect(calculateRubberBand(50, -100)).toBe(0);
    });

    it("damps displacement progressively as overshoot increases", () => {
      const dim = 600;
      const damp100 = calculateRubberBand(100, dim);
      const damp200 = calculateRubberBand(200, dim);
      const damp400 = calculateRubberBand(400, dim);

      // Value increases sublinearly
      expect(damp100).toBeLessThan(100);
      expect(damp200).toBeLessThan(200);
      expect(damp200 / damp100).toBeLessThan(2.0);
      expect(damp400 / damp200).toBeLessThan(2.0);
    });

    it("preserves sign for negative overshoot", () => {
      const dim = 500;
      const positive = calculateRubberBand(150, dim);
      const negative = calculateRubberBand(-150, dim);
      expect(negative).toBe(-positive);
    });
  });

  describe("resolveNearestSnapPoint", () => {
    it("returns 0 if snapPoints array is empty", () => {
      expect(resolveNearestSnapPoint(150, [])).toBe(0);
    });

    it("finds the nearest snap point correctly", () => {
      const snaps = [0, 300, 600];
      expect(resolveNearestSnapPoint(100, snaps)).toBe(0);
      expect(resolveNearestSnapPoint(200, snaps)).toBe(300);
      expect(resolveNearestSnapPoint(480, snaps)).toBe(600);
    });
  });

  describe("shouldDismissSheet", () => {
    const threshold = 150;

    it("dismisses immediately on strong downward flick even if current offset is small", () => {
      expect(shouldDismissSheet(20, 600, threshold)).toBe(true);
    });

    it("retains sheet on upward flick even if offset is close to threshold", () => {
      expect(shouldDismissSheet(140, -600, threshold)).toBe(false);
    });

    it("dismisses when projected offset exceeds threshold", () => {
      // offset 100 + project(200 px/s) -> 100 + ~100 = 200 >= 150
      expect(shouldDismissSheet(100, 200, threshold)).toBe(true);
    });

    it("retains sheet when projected offset does not reach threshold", () => {
      expect(shouldDismissSheet(30, 50, threshold)).toBe(false);
    });
  });
});
