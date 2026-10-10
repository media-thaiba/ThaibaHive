import { dlpSanitizer } from "../../guardrails/dlp-sanitizer";

describe("DlpSanitizer", () => {
  it("masks Aadhaar numbers correctly", () => {
    const text = "Student Aadhaar is 1234 5678 9012 for verification.";
    const result = dlpSanitizer.sanitizeInput(text);
    expect(result.sanitizedText).toContain("[REDACTED_AADHAAR]");
    expect(result.sanitizedText).not.toContain("1234 5678 9012");
    expect(result.maskedFieldsCount).toBe(1);
    expect(result.maskedItems[0].type).toBe("AADHAAR");
  });

  it("masks PAN numbers correctly and flags financial PII", () => {
    const text = "Parent PAN card number is ABCDE1234F on the form.";
    const result = dlpSanitizer.sanitizeInput(text);
    expect(result.sanitizedText).toContain("[REDACTED_PAN]");
    expect(result.sanitizedText).not.toContain("ABCDE1234F");
    expect(result.containsFinancialPii).toBe(true);
  });

  it("masks SSN numbers correctly", () => {
    const text = "Tax ID / SSN is 123-45-6789.";
    const result = dlpSanitizer.sanitizeInput(text);
    expect(result.sanitizedText).toContain("[REDACTED_SSN]");
    expect(result.sanitizedText).not.toContain("123-45-6789");
  });

  it("masks Credit Card numbers and requires local inference on heavy PII", () => {
    const text = "Payment made with card 4111-2222-3333-4444 and phone 555-123-4567, PAN ABCDE1234F.";
    const result = dlpSanitizer.sanitizeInput(text);
    expect(result.sanitizedText).toContain("[REDACTED_CARD]");
    expect(result.sanitizedText).toContain("[REDACTED_PHONE]");
    expect(result.sanitizedText).toContain("[REDACTED_PAN]");
    expect(result.maskedFieldsCount).toBeGreaterThanOrEqual(3);
    expect(result.requiresLocalInference).toBe(true);
  });

  it("detects medical keywords and enforces local inference policy", () => {
    const text = "Medical certificate issued with diagnosis: Acute Pharyngitis by doctor at City Clinic.";
    const result = dlpSanitizer.sanitizeInput(text);
    expect(result.containsMedicalPii).toBe(true);
    expect(result.requiresLocalInference).toBe(true);
  });

  it("scrubs output texts correctly", () => {
    const rawOutput = "Processed student record for PAN ABCDE1234F and phone 555-123-4567";
    const scrubbed = dlpSanitizer.scrubOutput(rawOutput);
    expect(scrubbed).toContain("[REDACTED_PAN]");
    expect(scrubbed).toContain("[REDACTED_PHONE]");
  });
});
