import { db } from "@/db";
import { staff, staffDepartments, staffInstitutions } from "@/db/schema";
import { encryptPiiField, decryptPiiField } from "@/lib/crypto/tenant-encryption";
import { eq } from "drizzle-orm";
import { GET, PATCH } from "@/app/api/staff/[id]/route";
import { verifySession } from "@thaiba/auth";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

describe("Staff PII AES-256-GCM Field Encryption", () => {
  const testStaffId = "test-staff-pii-" + Date.now();
  const testEmployeeId = "EMP-PII-" + Date.now();
  const testEmail = `pii-staff-${Date.now()}@thaibahive.local`;

  const superAdminSession = {
    staffId: "super-admin-001",
    role: "super_admin",
    employeeId: "SA001",
    email: "superadmin@thaiba.local",
    tokenVersion: 0,
    institutionScope: [],
  };

  beforeEach(() => {
    (verifySession as jest.Mock).mockResolvedValue(superAdminSession);
  });

  afterEach(async () => {
    try {
      await db.delete(staffDepartments).where(eq(staffDepartments.staffId, testStaffId)).run();
      await db.delete(staffInstitutions).where(eq(staffInstitutions.staffId, testStaffId)).run();
      await db.delete(staff).where(eq(staff.id, testStaffId)).run();
    } catch {
      // Ignore cleanup locks during teardown
    }
  });

  it("should encrypt Aadhaar, PAN, Bank Account, and IFSC in the database on creation", async () => {
    const rawAadhaar = "9876-5432-1098";
    const rawPan = "ABCDE9999Z";
    const rawBankAccount = "98765432109876";
    const rawIfscCode = "HDFC0001234";

    // Insert staff record with encrypted PII
    await db.insert(staff).values({
      id: testStaffId,
      email: testEmail,
      employeeId: testEmployeeId,
      firstName: "PII",
      lastName: "Tester",
      role: "staff",
      phone: "9876543210",
      aadhaar: encryptPiiField(rawAadhaar),
      pan: encryptPiiField(rawPan),
      bankAccount: encryptPiiField(rawBankAccount),
      ifscCode: encryptPiiField(rawIfscCode),
    }).run();

    // 1. Inspect raw SQLite database row directly
    const rawDbRow = await db
      .select({
        aadhaar: staff.aadhaar,
        pan: staff.pan,
        bankAccount: staff.bankAccount,
        ifscCode: staff.ifscCode,
      })
      .from(staff)
      .where(eq(staff.id, testStaffId))
      .get();

    expect(rawDbRow).toBeDefined();
    // Must be encrypted with AES-256-GCM format 'enc:gcm:iv:tag:ciphertext'
    expect(rawDbRow!.aadhaar).toMatch(/^enc:gcm:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);
    expect(rawDbRow!.pan).toMatch(/^enc:gcm:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);
    expect(rawDbRow!.bankAccount).toMatch(/^enc:gcm:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);
    expect(rawDbRow!.ifscCode).toMatch(/^enc:gcm:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);

    // Must NOT contain plaintext in DB
    expect(rawDbRow!.aadhaar).not.toContain(rawAadhaar);
    expect(rawDbRow!.pan).not.toContain(rawPan);
    expect(rawDbRow!.bankAccount).not.toContain(rawBankAccount);
    expect(rawDbRow!.ifscCode).not.toContain(rawIfscCode);

    // 2. Query through GET /api/staff/[id] and verify transparent decryption
    const mockRequest = new Request(`http://localhost:3000/api/staff/${testStaffId}`);

    const getResponse = await GET(mockRequest, { params: Promise.resolve({ id: testStaffId }) });
    expect(getResponse.status).toBe(200);

    const data = await getResponse.json();
    expect(data.staff).toBeDefined();
    expect(data.staff.aadhaar).toBe(rawAadhaar);
    expect(data.staff.pan).toBe(rawPan);
    expect(data.staff.bankAccount).toBe(rawBankAccount);
    expect(data.staff.ifscCode).toBe(rawIfscCode);
  });

  it("should encrypt updated PII fields via PATCH /api/staff/[id]", async () => {
    // Insert base staff
    await db.insert(staff).values({
      id: testStaffId,
      email: testEmail,
      employeeId: testEmployeeId,
      firstName: "Patch",
      lastName: "Tester",
      role: "staff",
    }).run();

    const newAadhaar = "1111-2222-3333";
    const newPan = "XYZPA9999Q";
    const newBank = "11223344556677";

    const patchRequest = new Request(`http://localhost:3000/api/staff/${testStaffId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        aadhaar: newAadhaar,
        pan: newPan,
        bankAccount: newBank,
      }),
    });

    const patchResponse = await PATCH(patchRequest, { params: Promise.resolve({ id: testStaffId }) });
    expect(patchResponse.status).toBe(200);

    const patchData = await patchResponse.json();
    expect(patchData.staff.aadhaar).toBe(newAadhaar);
    expect(patchData.staff.pan).toBe(newPan);
    expect(patchData.staff.bankAccount).toBe(newBank);

    // Verify DB row contains encrypted ciphertext
    const rawDbRow = await db
      .select({
        aadhaar: staff.aadhaar,
        pan: staff.pan,
        bankAccount: staff.bankAccount,
      })
      .from(staff)
      .where(eq(staff.id, testStaffId))
      .get();

    expect(rawDbRow!.aadhaar).toMatch(/^enc:gcm:/);
    expect(rawDbRow!.pan).toMatch(/^enc:gcm:/);
    expect(rawDbRow!.bankAccount).toMatch(/^enc:gcm:/);
    expect(rawDbRow!.aadhaar).not.toContain(newAadhaar);
  });

  it("should maintain backward compatibility with unencrypted legacy PII data", async () => {
    const legacyAadhaar = "legacy-aadhaar-1234";
    const legacyPan = "LEGACYPAN99";

    // Insert raw unencrypted legacy data directly into database table
    await db.insert(staff).values({
      id: testStaffId,
      email: testEmail,
      employeeId: testEmployeeId,
      firstName: "Legacy",
      lastName: "Tester",
      role: "staff",
      aadhaar: legacyAadhaar,
      pan: legacyPan,
    }).run();

    const mockRequest = new Request(`http://localhost:3000/api/staff/${testStaffId}`);

    const getResponse = await GET(mockRequest, { params: Promise.resolve({ id: testStaffId }) });
    expect(getResponse.status).toBe(200);

    const data = await getResponse.json();
    expect(data.staff.aadhaar).toBe(legacyAadhaar);
    expect(data.staff.pan).toBe(legacyPan);
  });

  it("should handle null and empty PII values cleanly", () => {
    expect(encryptPiiField(null)).toBeNull();
    expect(encryptPiiField(undefined)).toBeNull();
    expect(encryptPiiField("")).toBeNull();
    expect(encryptPiiField("   ")).toBeNull();

    expect(decryptPiiField(null)).toBeNull();
    expect(decryptPiiField(undefined)).toBeNull();
    expect(decryptPiiField("")).toBeNull();
  });
});
