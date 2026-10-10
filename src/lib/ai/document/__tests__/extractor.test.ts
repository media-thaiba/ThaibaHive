import { documentExtractor } from "../extractor";

describe("DocumentExtractor", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("extracts and sanitizes fee receipt successfully", async () => {
    const rawText = "Receipt REC-101 for Student Ayaan with Aadhaar 1234 5678 9012. Paid Rs. 15000 via online.";
    const result = await documentExtractor.extract({
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
      documentType: "fee_receipt",
      rawText,
      institutionId: "inst_test_01",
    });

    expect(result.sanitizationApplied).toBe(true);
    expect(result.maskedFieldsCount).toBe(1);
    expect(result.extractedData).toBeDefined();
    expect(result.status).toBeDefined();
    expect(result.confidence.score).toBeGreaterThan(0);
  });

  it("routes medical certificate to local inference due to medical PII policy", async () => {
    const rawText = "Doctor Dr. K. Sharma diagnosed Acute Viral Bronchitis. Clinic: City Health. Start: 2026-10-01 End: 2026-10-04";
    const result = await documentExtractor.extract({
      fileName: "medical_cert.jpg",
      mimeType: "image/jpeg",
      documentType: "medical_certificate",
      rawText,
      institutionId: "inst_test_01",
    });

    expect(result.usedLocalInference).toBe(true);
    expect(result.extractedData.patientName).toBeDefined();
    expect(result.confidence).toBeDefined();
  });

  it("handles student identity card extraction", async () => {
    const result = await documentExtractor.extract({
      fileName: "student_id.png",
      mimeType: "image/png",
      documentType: "identity_card",
      rawText: "Student ID Card STU-1001 Ayaan Rahman Grade 10-A 2026-2027",
      institutionId: "inst_test_01",
    });

    expect(result.extractedData.studentId).toBeDefined();
    expect(result.confidence.score).toBeGreaterThanOrEqual(0.85);
  });

  it("handles CCTV incident extraction", async () => {
    const result = await documentExtractor.extract({
      fileName: "cctv_frame.jpg",
      mimeType: "image/jpeg",
      documentType: "cctv_incident",
      rawText: "North Gate Perimeter unauthorized entry at 2026-10-10T12:00:00Z. Severity medium.",
      institutionId: "inst_test_01",
    });

    expect(result.extractedData.incidentType).toBeDefined();
    expect(result.extractedData.severity).toBeDefined();
  });
});
