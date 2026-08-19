import { generateQRPayload, verifyQRPayload } from "../hall-ticket-service";

describe("Hall Ticket & QR Verification Engine", () => {
  it("should generate a valid QR payload and verify signature cleanly", () => {
    const qrPayload = generateQRPayload("HT-1001", "stud_01", "exam_100");
    expect(qrPayload).toBeDefined();
    expect(typeof qrPayload).toBe("string");

    const verification = verifyQRPayload(qrPayload);
    expect(verification.valid).toBe(true);
    expect(verification.payload.ticketNumber).toBe("HT-1001");
    expect(verification.payload.studentId).toBe("stud_01");
    expect(verification.payload.examId).toBe("exam_100");
  });

  it("should reject tampered or invalid QR payloads", () => {
    const invalidPayload = Buffer.from("invalid-json").toString("base64");
    const result = verifyQRPayload(invalidPayload);
    expect(result.valid).toBe(false);
  });
});
