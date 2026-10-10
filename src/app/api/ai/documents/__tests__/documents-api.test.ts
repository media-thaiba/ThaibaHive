import { db } from "@/db";
import { institutions, staff, staffInstitutions, aiDocuments } from "@thaiba/db/schema";
import { POST as uploadDoc } from "../upload/route";
import { POST as confirmDoc } from "../[id]/confirm/route";
import { GET as getDocs } from "../route";
import { GET as getSingleDoc, DELETE as deleteDoc } from "../[id]/route";
import { eq } from "drizzle-orm";

const mockInstId = "inst_test_ai_doc_001";
const mockOtherInstId = "inst_other_ai_doc_002";
const mockStaffId = "staff_test_ai_doc_001";

let currentMockSession = {
  staffId: mockStaffId,
  email: "ai_doc_tester@thaiba.dev",
  role: "admin",
  employeeId: "EMP-AI-01",
  name: "AI Doc Admin",
  tokenVersion: 0,
  institutionId: mockInstId,
};

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn().mockImplementation(() => Promise.resolve(currentMockSession)),
    resolveScopedInstitutionId: jest.fn().mockImplementation(() => currentMockSession.institutionId),
    resolveRequestInstitution: jest.fn().mockImplementation(() => Promise.resolve(currentMockSession.institutionId)),
  };
});

describe("AI Documents API Integration Tests", () => {
  beforeAll(async () => {
    // Clean up
    await db.delete(aiDocuments).where(eq(aiDocuments.institutionId, mockInstId));
    await db.delete(aiDocuments).where(eq(aiDocuments.institutionId, mockOtherInstId));

    // Seed test institution and staff
    await db.insert(institutions).values({
      id: mockInstId,
      name: "AI Doc Test Academy",
      code: "AIDOC01",
    }).onConflictDoNothing();

    await db.insert(institutions).values({
      id: mockOtherInstId,
      name: "Other Institution",
      code: "OTHER01",
    }).onConflictDoNothing();

    await db.insert(staff).values({
      id: mockStaffId,
      email: "ai_doc_tester@thaiba.dev",
      employeeId: "EMP-AI-01",
      firstName: "AI Doc",
      lastName: "Admin",
      role: "admin",
    }).onConflictDoNothing();

    await db.insert(staffInstitutions).values({
      id: "si_ai_doc_01",
      staffId: mockStaffId,
      institutionId: mockInstId,
    }).onConflictDoNothing();
  });

  afterAll(async () => {
    await db.delete(aiDocuments).where(eq(aiDocuments.institutionId, mockInstId));
    await db.delete(aiDocuments).where(eq(aiDocuments.institutionId, mockOtherInstId));
    await db.delete(staffInstitutions).where(eq(staffInstitutions.staffId, mockStaffId));
    await db.delete(staff).where(eq(staff.id, mockStaffId));
    await db.delete(institutions).where(eq(institutions.id, mockInstId));
    await db.delete(institutions).where(eq(institutions.id, mockOtherInstId));
  });

  it("POST /api/ai/documents/upload extracts and stores document", async () => {
    const req = new Request("http://localhost/api/ai/documents/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "tuition_receipt.pdf",
        mimeType: "application/pdf",
        documentType: "fee_receipt",
        rawText: "Receipt REC-555 for Ayaan. Total: Rs 15000. Online payment.",
      }),
    });

    const res = await uploadDoc(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.document.id).toBeDefined();
    expect(json.document.institutionId).toBe(mockInstId);
    expect(json.document.documentType).toBe("fee_receipt");
    expect(json.extraction).toBeDefined();
  });

  it("GET /api/ai/documents retrieves scoped documents", async () => {
    const req = new Request("http://localhost/api/ai/documents?limit=10", {
      method: "GET",
    });

    const res = await getDocs(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.documents)).toBe(true);
    expect(json.documents.length).toBeGreaterThanOrEqual(1);
    expect(json.documents[0].institutionId).toBe(mockInstId);
  });

  it("GET and POST /confirm on a single document", async () => {
    // 1. Upload a doc first
    const uploadReq = new Request("http://localhost/api/ai/documents/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "medical.pdf",
        mimeType: "application/pdf",
        documentType: "medical_certificate",
        rawText: "Doctor Dr. Khan. Clinic: Care. Diagnosis: Flu.",
      }),
    });
    const uploadRes = await uploadDoc(uploadReq);
    const { document } = await uploadRes.json();
    const docId = document.id;

    // 2. GET by ID
    const getReq = new Request(`http://localhost/api/ai/documents/${docId}`, { method: "GET" });
    const getRes = await getSingleDoc(getReq, { params: Promise.resolve({ id: docId }) } as any);
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.document.id).toBe(docId);

    // 3. Confirm doc
    const confirmReq = new Request(`http://localhost/api/ai/documents/${docId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirmedData: {
          patientName: "Ayaan Rahman",
          doctorName: "Dr. Khan",
          diagnosis: "Seasonal Flu",
        },
        targetEntityType: "leave_request",
        targetEntityId: "leave_123",
      }),
    });
    const confirmRes = await confirmDoc(confirmReq, { params: Promise.resolve({ id: docId }) } as any);
    expect(confirmRes.status).toBe(200);
    const confirmJson = await confirmRes.json();
    expect(confirmJson.document.status).toBe("confirmed");
    expect(confirmJson.document.targetEntityType).toBe("leave_request");

    // 4. DELETE doc
    const deleteReq = new Request(`http://localhost/api/ai/documents/${docId}`, { method: "DELETE" });
    const deleteRes = await deleteDoc(deleteReq, { params: Promise.resolve({ id: docId }) } as any);
    expect(deleteRes.status).toBe(200);
  });
});
