import { confidenceEngine } from "../confidence";

describe("ConfidenceEngine", () => {
  it("approves valid fee receipt with consistent totals", () => {
    const validReceipt = {
      receiptNumber: "REC-2026-001",
      studentName: "Fatima Zahra",
      paymentDate: "2026-10-10",
      totalAmount: 10000,
      paymentMode: "online",
      lineItems: [
        { description: "Tuition Fee", amount: 8000 },
        { description: "Library Fee", amount: 2000 },
      ],
    };

    const evalResult = confidenceEngine.evaluate("fee_receipt", validReceipt, 0.95);
    expect(evalResult.score).toBeGreaterThanOrEqual(0.85);
    expect(evalResult.isApproved).toBe(true);
    expect(evalResult.validationErrors.length).toBe(0);
  });

  it("flags fee receipt with arithmetic discrepancy between line items and total", () => {
    const invalidReceipt = {
      receiptNumber: "REC-2026-002",
      studentName: "Fatima Zahra",
      paymentDate: "2026-10-10",
      totalAmount: 10000, // Discrepancy: items sum to 7000
      paymentMode: "online",
      lineItems: [
        { description: "Tuition Fee", amount: 5000 },
        { description: "Library Fee", amount: 2000 },
      ],
    };

    const evalResult = confidenceEngine.evaluate("fee_receipt", invalidReceipt, 0.95);
    expect(evalResult.isApproved).toBe(false);
    expect(evalResult.validationErrors.some((e) => e.includes("Line items sum"))).toBe(true);
  });

  it("evaluates valid medical certificate", () => {
    const validMedCert = {
      patientName: "Zaid Ahmed",
      doctorName: "Dr. A. Khan",
      doctorRegistrationNumber: "REG-99482",
      hospitalOrClinic: "Al-Shifa Medical Center",
      startDate: "2026-10-01",
      endDate: "2026-10-05",
      diagnosis: "Viral Fever with recovery",
      fitnessToResume: true,
    };

    const evalResult = confidenceEngine.evaluate("medical_certificate", validMedCert, 0.9);
    expect(evalResult.score).toBeGreaterThanOrEqual(0.85);
    expect(evalResult.isApproved).toBe(true);
  });

  it("flags medical certificate with inverted dates", () => {
    const invalidMedCert = {
      patientName: "Zaid Ahmed",
      doctorName: "Dr. A. Khan",
      doctorRegistrationNumber: "REG-99482",
      hospitalOrClinic: "Al-Shifa Medical Center",
      startDate: "2026-10-10",
      endDate: "2026-10-01", // End date before start date
      diagnosis: "Viral Fever",
      fitnessToResume: true,
    };

    const evalResult = confidenceEngine.evaluate("medical_certificate", invalidMedCert, 0.9);
    expect(evalResult.isApproved).toBe(false);
    expect(evalResult.validationErrors.some((e) => e.includes("Invalid medical leave date range"))).toBe(true);
  });
});
