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
