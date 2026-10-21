import {
  calculateGrade,
  calculateSubjectResult,
  calculateStudentTabulation,
} from "../grade-calculator";

describe("Grade Calculator Engine", () => {
  describe("calculateGrade", () => {
    it("should correctly map percentages to letter grades and GPA", () => {
      expect(calculateGrade(95)).toEqual({ letterGrade: "O", gpa: 10.0, description: "Outstanding" });
      expect(calculateGrade(85)).toEqual({ letterGrade: "A+", gpa: 9.0, description: "Excellent" });
      expect(calculateGrade(75)).toEqual({ letterGrade: "A", gpa: 8.0, description: "Very Good" });
      expect(calculateGrade(65)).toEqual({ letterGrade: "B+", gpa: 7.0, description: "Good" });
      expect(calculateGrade(55)).toEqual({ letterGrade: "B", gpa: 6.0, description: "Above Average" });
      expect(calculateGrade(45)).toEqual({ letterGrade: "C", gpa: 5.0, description: "Average / Pass" });
      expect(calculateGrade(35)).toEqual({ letterGrade: "F", gpa: 0.0, description: "Fail" });
    });

    it("should handle floating-point boundary conditions without interval gaps", () => {
      // 89.999% rounds to 90.00% -> "O"
      expect(calculateGrade(89.999).letterGrade).toBe("O");
      // 89.994% rounds to 89.99% -> "A+"
      expect(calculateGrade(89.994).letterGrade).toBe("A+");
      // Exactly 80.00% -> "A+"
      expect(calculateGrade(80.00).letterGrade).toBe("A+");
      // 79.999% rounds to 80.00% -> "A+"
      expect(calculateGrade(79.999).letterGrade).toBe("A+");
      // 79.994% rounds to 79.99% -> "A"
      expect(calculateGrade(79.994).letterGrade).toBe("A");
      // Out of bounds: > 100 clamped to 100 -> "O"
      expect(calculateGrade(105).letterGrade).toBe("O");
      // Out of bounds: < 0 clamped to 0 -> "F"
      expect(calculateGrade(-5).letterGrade).toBe("F");
    });
  });

  describe("calculateSubjectResult", () => {
    it("should calculate subject result for a passing mark", () => {
      const result = calculateSubjectResult({
        marksObtained: 85,
        maxMarks: 100,
        passMarks: 40,
      });

      expect(result.isPass).toBe(true);
      expect(result.letterGrade).toBe("A+");
      expect(result.gpa).toBe(9.0);
      expect(result.percentage).toBe(85);
    });

    it("should handle absent student correctly", () => {
      const result = calculateSubjectResult({
        marksObtained: null,
        maxMarks: 100,
        passMarks: 40,
        isAbsent: true,
      });

      expect(result.isPass).toBe(false);
      expect(result.isAbsent).toBe(true);
      expect(result.letterGrade).toBe("F");
      expect(result.gpa).toBe(0.0);
    });

    it("should clamp marks exceeding maxMarks to maxMarks", () => {
      const result = calculateSubjectResult({
        marksObtained: 120,
        maxMarks: 100,
        passMarks: 40,
      });

      expect(result.percentage).toBe(100);
      expect(result.letterGrade).toBe("O");
      expect(result.gpa).toBe(10.0);
    });
  });

  describe("calculateStudentTabulation", () => {
    it("should calculate overall tabulation for a student passing all subjects", () => {
      const subjects = [
        { marksObtained: 80, maxMarks: 100, passMarks: 40, creditWeight: 4 },
        { marksObtained: 90, maxMarks: 100, passMarks: 40, creditWeight: 3 },
        { marksObtained: 70, maxMarks: 100, passMarks: 40, creditWeight: 3 },
      ];

      const tabulation = calculateStudentTabulation(subjects);

      expect(tabulation.totalMarks).toBe(240);
      expect(tabulation.percentage).toBe(80);
      expect(tabulation.resultStatus).toBe("pass");
      expect(tabulation.failedSubjectsCount).toBe(0);
      expect(tabulation.gpa).toBeGreaterThan(8.0);
    });

    it("should safely handle zero, negative, or invalid credit weights", () => {
      const subjects = [
        { marksObtained: 80, maxMarks: 100, passMarks: 40, creditWeight: 0 }, // Should default to weight 1
        { marksObtained: 90, maxMarks: 100, passMarks: 40, creditWeight: -2 }, // Should default to weight 1
        { marksObtained: 70, maxMarks: 100, passMarks: 40, creditWeight: NaN }, // Should default to weight 1
      ];

      const tabulation = calculateStudentTabulation(subjects);

      expect(tabulation.totalMarks).toBe(240);
      expect(tabulation.percentage).toBe(80);
      expect(tabulation.resultStatus).toBe("pass");
      expect(tabulation.gpa).toBe(9.0);
    });

    it("should mark result as compartment when student fails exactly 1 subject", () => {
      const subjects = [
        { marksObtained: 80, maxMarks: 100, passMarks: 40 },
        { marksObtained: 30, maxMarks: 100, passMarks: 40 }, // Failed
        { marksObtained: 75, maxMarks: 100, passMarks: 40 },
      ];

      const tabulation = calculateStudentTabulation(subjects);

      expect(tabulation.resultStatus).toBe("compartment");
      expect(tabulation.failedSubjectsCount).toBe(1);
    });

    it("should mark result as fail when student fails more than 1 subject", () => {
      const subjects = [
        { marksObtained: 35, maxMarks: 100, passMarks: 40 },
        { marksObtained: 30, maxMarks: 100, passMarks: 40 },
        { marksObtained: 75, maxMarks: 100, passMarks: 40 },
      ];

      const tabulation = calculateStudentTabulation(subjects);

      expect(tabulation.resultStatus).toBe("fail");
      expect(tabulation.failedSubjectsCount).toBe(2);
    });
  });
});
