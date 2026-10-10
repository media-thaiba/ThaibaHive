import { db } from "@/db";
import { institutions, staff, staffInstitutions, aiCopilotSessions } from "@thaiba/db/schema";
import { POST as createSession, GET as getSession, PATCH as updateSession } from "../session/route";
import { POST as voiceInteract } from "../interact/route";
import { eq } from "drizzle-orm";

const mockInstId = "inst_test_voice_copilot_001";
const mockStaffId = "staff_test_voice_copilot_001";

let currentMockSession = {
  staffId: mockStaffId,
  email: "voice_tester@thaiba.dev",
  role: "admin",
  employeeId: "EMP-VOICE-01",
  name: "Voice Copilot Tester",
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

describe("Voice Copilot V2 API Integration Tests", () => {
  beforeAll(async () => {
    // Cleanup prior test sessions
    await db.delete(aiCopilotSessions).where(eq(aiCopilotSessions.institutionId, mockInstId));

    // Seed test institution and staff
    await db.insert(institutions).values({
      id: mockInstId,
      name: "Voice Test Academy",
      code: "VOICE01",
    }).onConflictDoNothing();

    await db.insert(staff).values({
      id: mockStaffId,
      email: "voice_tester@thaiba.dev",
      employeeId: "EMP-VOICE-01",
      firstName: "Voice",
      lastName: "Tester",
      role: "admin",
    }).onConflictDoNothing();

    await db.insert(staffInstitutions).values({
      id: "si_voice_test_01",
      staffId: mockStaffId,
      institutionId: mockInstId,
    }).onConflictDoNothing();
  });

  afterAll(async () => {
    await db.delete(aiCopilotSessions).where(eq(aiCopilotSessions.institutionId, mockInstId));
    await db.delete(staffInstitutions).where(eq(staffInstitutions.staffId, mockStaffId));
    await db.delete(staff).where(eq(staff.id, mockStaffId));
    await db.delete(institutions).where(eq(institutions.id, mockInstId));
  });

  it("manages full voice session lifecycle and interactions", async () => {
    // 1. Create a new voice session
    const createReq = new Request("http://localhost/api/ai/copilot/voice/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelType: "voice",
        context: { currentRoute: "/dashboard" },
      }),
    });

    const createRes = await createSession(createReq);
    expect(createRes.status).toBe(201);
    const createJson = await createRes.json();
    expect(createJson.success).toBe(true);
    expect(createJson.session.id).toBeDefined();
    expect(createJson.session.channelType).toBe("voice");

    const sessionId = createJson.session.id;

    // 2. GET current active session
    const getReq = new Request("http://localhost/api/ai/copilot/voice/session", { method: "GET" });
    const getRes = await getSession(getReq);
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.session.id).toBe(sessionId);

    // 3. Execute voice interaction turn
    const interactReq = new Request("http://localhost/api/ai/copilot/voice/interact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        clientTranscript: "Open timetable for today",
        voiceProfile: "neutral_professional",
        returnAudio: true,
      }),
    });

    const interactRes = await voiceInteract(interactReq);
    expect(interactRes.status).toBe(200);
    const interactJson = await interactRes.json();
    expect(interactJson.success).toBe(true);
    expect(interactJson.transcript).toBe("Open timetable for today");
    expect(interactJson.intent.intent).toBe("navigate");
    expect(interactJson.spokenResponse).toBeDefined();
    expect(interactJson.audio).toBeDefined();
    expect(interactJson.audio.audioBase64).toBeDefined();

    // 4. Terminate voice session
    const patchReq = new Request("http://localhost/api/ai/copilot/voice/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        status: "ended",
      }),
    });

    const patchRes = await updateSession(patchReq);
    expect(patchRes.status).toBe(200);
    const patchJson = await patchRes.json();
    expect(patchJson.session.status).toBe("ended");
  });
});
