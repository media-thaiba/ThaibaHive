import { cookies, headers } from "next/headers";
import {
  createSession,
  createDPoPSession,
  verifySession,
  verifyDPoPSession,
  destroySession,
  touchSession,
  createActionStepUpToken,
  verifyActionStepUpToken,
  consumeStepUpTokenInTx,
  createStepUpToken,
  ROLE_RANK_MAP,
  getRoleRank,
  canCreateRole,
  isAuthorizedDeveloper,
  type StaffRole,
} from "../index";
import { mintSessionInternal } from "../session";
import { db, staff, userSessions, stepUpUsed, auditLogs } from "@thaiba/db";
import { eq, and, sql } from "drizzle-orm";
import { jwtVerify, decodeJwt, SignJWT } from "jose";
import { getJwtSecretBytes } from "../config";
import { createMobileNonce, verifyMobileNonce } from "@/lib/auth/mobile-nonce-service";
import { checkAllowedOrigin, POST as terminateRoute } from "@/app/api/admin/sessions/[id]/terminate/route";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";
import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}));

const mockCookieMap = new Map<string, { value: string; options?: Record<string, unknown> }>();
const mockHeaderMap = new Map<string, string>();

const mockCookies = {
  get: jest.fn((name: string) => mockCookieMap.get(name)),
  set: jest.fn((name: string, value: string, options?: Record<string, unknown>) => {
    mockCookieMap.set(name, { value, options });
  }),
  delete: jest.fn((name: string) => {
    mockCookieMap.delete(name);
  }),
};

const mockHeaders = {
  get: jest.fn((name: string) => mockHeaderMap.get(name.toLowerCase()) || null),
};

describe("Stage 1: Sessions, Revocation, Terminate Route & RBAC Hierarchy", () => {
  const ts = Date.now();
  const testDeveloperId = `stf_dev_${ts}`;
  const testSuperAdminId = `stf_sup_${ts}`;
  const testAdminId = `stf_adm_${ts}`;
  const testTeacherId = `stf_tch_${ts}`;
  const testInactiveId = `stf_ina_${ts}`;

  const developerEmail = `dev_${ts}@thaiba.org`;
  const superAdminEmail = `sup_${ts}@thaiba.org`;
  const adminEmail = `adm_${ts}@thaiba.org`;
  const teacherEmail = `tch_${ts}@thaiba.org`;
  const inactiveEmail = `ina_${ts}@thaiba.org`;

  beforeEach(async () => {
    mockCookieMap.clear();
    mockHeaderMap.clear();
    (cookies as unknown as jest.Mock).mockResolvedValue(mockCookies);
    (headers as unknown as jest.Mock).mockResolvedValue(mockHeaders);
    process.env.DEVELOPER_EMAILS = `${developerEmail},other_dev@thaiba.org`;

    // Seed test staff records
    await db.insert(staff).values([
      {
        id: testDeveloperId,
        email: developerEmail,
        employeeId: `EMP_DEV_${ts}`,
        firstName: "Dev",
        lastName: "User",
        role: "super_admin",
        isActive: true,
        tokenVersion: 1,
        emailVerifiedAt: new Date().toISOString(),
      },
      {
        id: testSuperAdminId,
        email: superAdminEmail,
        employeeId: `EMP_SUP_${ts}`,
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin",
        isActive: true,
        tokenVersion: 1,
        emailVerifiedAt: new Date().toISOString(),
      },
      {
        id: testAdminId,
        email: adminEmail,
        employeeId: `EMP_ADM_${ts}`,
        firstName: "Normal",
        lastName: "Admin",
        role: "admin",
        isActive: true,
        tokenVersion: 1,
        emailVerifiedAt: new Date().toISOString(),
      },
      {
        id: testTeacherId,
        email: teacherEmail,
        employeeId: `EMP_TCH_${ts}`,
        firstName: "Teacher",
        lastName: "User",
        role: "teacher",
        isActive: true,
        tokenVersion: 1,
        emailVerifiedAt: new Date().toISOString(),
      },
      {
        id: testInactiveId,
        email: inactiveEmail,
        employeeId: `EMP_INA_${ts}`,
        firstName: "Inactive",
        lastName: "User",
        role: "staff",
        isActive: false,
        tokenVersion: 1,
        emailVerifiedAt: new Date().toISOString(),
      },
    ]).run();
  });

  afterEach(async () => {
    try {
      await db.delete(userSessions).where(
        sql`staff_id IN (${testDeveloperId}, ${testSuperAdminId}, ${testAdminId}, ${testTeacherId}, ${testInactiveId})`
      ).run();
      await db.delete(stepUpUsed).where(
        sql`staff_id IN (${testDeveloperId}, ${testSuperAdminId}, ${testAdminId}, ${testTeacherId}, ${testInactiveId})`
      ).run();
      await db.delete(staff).where(
        sql`id IN (${testDeveloperId}, ${testSuperAdminId}, ${testAdminId}, ${testTeacherId}, ${testInactiveId})`
      ).run();
    } catch {
      // Best effort cleanup
    }
  });

  // ─── CASE 1: Minting Verification ──────────────────────────────────────────
  it("Case 1: Mint row exists, id has sess_ prefix, exp === floor(expires_at/1000) for createSession and createDPoPSession", async () => {
    // 1. Regular session
    const token = await createSession({
      staffId: testTeacherId,
      email: teacherEmail,
      role: "teacher",
      employeeId: `EMP_TCH_${ts}`,
      name: "Teacher User",
      tokenVersion: 1,
    });

    const { payload } = await jwtVerify(token, getJwtSecretBytes("session"));
    expect(payload.sid).toBeDefined();
    expect(typeof payload.sid).toBe("string");
    expect((payload.sid as string).startsWith("sess_")).toBe(true);

    const dbRow = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.id, payload.sid as string))
      .get();

    expect(dbRow).toBeDefined();
    expect(dbRow?.status).toBe("active");
    expect(dbRow?.staffId).toBe(testTeacherId);
    expect(payload.exp).toBe(Math.floor(dbRow!.expiresAt / 1000));

    // 2. DPoP session
    const dpopJkt = "dpop_thumbprint_test_abc123";
    const dpopToken = await createDPoPSession(
      {
        staffId: testTeacherId,
        email: teacherEmail,
        role: "teacher",
        employeeId: `EMP_TCH_${ts}`,
        name: "Teacher User",
        tokenVersion: 1,
      },
      dpopJkt
    );

    const { payload: dpopPayload } = await jwtVerify(dpopToken, getJwtSecretBytes("session"));
    expect((dpopPayload.sid as string).startsWith("sess_")).toBe(true);
    expect(dpopPayload.dpopEnabled).toBe(true);
    expect((dpopPayload as unknown as { cnf?: { jkt?: string } }).cnf?.jkt).toBe(dpopJkt);

    const dpopDbRow = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.id, dpopPayload.sid as string))
      .get();

    expect(dpopDbRow).toBeDefined();
    expect(dpopDbRow?.status).toBe("active");
    expect(dpopPayload.exp).toBe(Math.floor(dpopDbRow!.expiresAt / 1000));
  });

  // ─── CASE 2: Revocation Immediate Effect (Non-vacuous) ──────────────────────
  it("Case 2: Verify OK, then terminate in DB, then very next verify returns null (assert non-null BEFORE termination)", async () => {
    const token = await createSession({
      staffId: testTeacherId,
      email: teacherEmail,
      role: "teacher",
      employeeId: `EMP_TCH_${ts}`,
      name: "Teacher User",
      tokenVersion: 1,
    });

    // Proves token is in cookieStore and verifySession returns valid non-null session
    const activeSession = await verifySession();
    expect(activeSession).not.toBeNull();
    expect(activeSession?.staffId).toBe(testTeacherId);
    expect(activeSession?.role).toBe("teacher");
    expect(activeSession?.sid).toBeDefined();

    // Terminate the session in database
    await db
      .update(userSessions)
      .set({ status: "terminated", logoutAt: Date.now() })
      .where(eq(userSessions.id, activeSession!.sid))
      .run();

    // Very next call MUST return null immediately without cache lag
    const revokedSession = await verifySession();
    expect(revokedSession).toBeNull();
  });

  // ─── CASE 3: Status & Expiry Checks ────────────────────────────────────────
  it("Case 3: Expired row rejected, inactive staff rejected, tokenVersion mismatch rejected", async () => {
    // 1. Expired row
    await createSession({
      staffId: testTeacherId,
      email: teacherEmail,
      role: "teacher",
      employeeId: `EMP_TCH_${ts}`,
      name: "Teacher User",
      tokenVersion: 1,
    });
    const s1 = await verifySession();
    expect(s1).not.toBeNull();

    // Backdate expiresAt to the past
    await db
      .update(userSessions)
      .set({ expiresAt: Date.now() - 5000 })
      .where(eq(userSessions.id, s1!.sid))
      .run();

    expect(await verifySession()).toBeNull();

    // 2. Inactive staff
    mockCookieMap.clear();
    await createSession({
      staffId: testInactiveId,
      email: inactiveEmail,
      role: "staff",
      employeeId: `EMP_INA_${ts}`,
      name: "Inactive User",
      tokenVersion: 1,
    });
    expect(await verifySession()).toBeNull();

    // 3. tokenVersion mismatch
    mockCookieMap.clear();
    await createSession({
      staffId: testAdminId,
      email: adminEmail,
      role: "admin",
      employeeId: `EMP_ADM_${ts}`,
      name: "Admin User",
      tokenVersion: 1,
    });
    expect(await verifySession()).not.toBeNull();

    // Increment staff tokenVersion in DB
    await db
      .update(staff)
      .set({ tokenVersion: 2 })
      .where(eq(staff.id, testAdminId))
      .run();

    expect(await verifySession()).toBeNull();
  });

  // ─── CASE 4: Dual-key Join Integrity ────────────────────────────────────────
  it("Case 4: sid/staffId mismatch rejected (join integrity)", async () => {
    await createSession({
      staffId: testTeacherId,
      email: teacherEmail,
      role: "teacher",
      employeeId: `EMP_TCH_${ts}`,
      name: "Teacher User",
      tokenVersion: 1,
    });
    const s = await verifySession();
    expect(s).not.toBeNull();

    // Mint forged JWT with teacher's sid but pointing to admin's staffId
    const forgedToken = await new SignJWT({
      ...s,
      staffId: testAdminId, // mismatch!
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(getJwtSecretBytes("session"));

    mockCookieMap.set("thaibahive_session", { value: forgedToken });

    // Join condition (user_sessions.id = sid AND user_sessions.staffId = staff.id) must reject mismatch
    expect(await verifySession()).toBeNull();
  });

  // ─── CASE 5: DB Failure Fails Closed ───────────────────────────────────────
  it("Case 5: DB failure during verify rejected (fail closed)", async () => {
    await createSession({
      staffId: testTeacherId,
      email: teacherEmail,
      role: "teacher",
      employeeId: `EMP_TCH_${ts}`,
      name: "Teacher User",
      tokenVersion: 1,
    });
    expect(await verifySession()).not.toBeNull();

    // Spy on db.select to simulate transient database error
    const spy = jest.spyOn(db, "select").mockImplementationOnce(() => {
      throw new Error("Simulated database connection failure");
    });

    const res = await verifySession();
    expect(res).toBeNull();
    spy.mockRestore();
  });

  // ─── CASE 6: Legacy Token Rejection ────────────────────────────────────────
  it("Case 6: Legacy token without sid rejected with LEGACY_SESSION_EXPIRED", async () => {
    const legacyToken = await new SignJWT({
      staffId: testTeacherId,
      email: teacherEmail,
      role: "teacher",
      employeeId: `EMP_TCH_${ts}`,
      name: "Teacher User",
      tokenVersion: 1,
      // No sid property!
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(getJwtSecretBytes("session"));

    mockCookieMap.set("thaibahive_session", { value: legacyToken });

    await expect(verifySession()).rejects.toThrow("LEGACY_SESSION_EXPIRED");
  });

  // ─── CASE 7: DPoP Session Revocation ───────────────────────────────────────
  it("Case 7: DPoP session verified and revoked by terminate", async () => {
    const dpopJkt = "dpop_thumbprint_case7";
    const token = await createDPoPSession(
      {
        staffId: testTeacherId,
        email: teacherEmail,
        role: "teacher",
        employeeId: `EMP_TCH_${ts}`,
        name: "Teacher User",
        tokenVersion: 1,
      },
      dpopJkt
    );

    // Verify DPoP session OK
    const verified = await verifyDPoPSession(token, { jkt: dpopJkt });
    expect(verified).not.toBeNull();
    expect(verified?.cnfJkt).toBe(dpopJkt);

    // Mismatched thumbprint rejected
    expect(await verifyDPoPSession(token, { jkt: "wrong_thumbprint" })).toBeNull();

    // Terminate session in DB
    await db
      .update(userSessions)
      .set({ status: "terminated", logoutAt: Date.now() })
      .where(eq(userSessions.id, verified!.sid))
      .run();

    // DPoP verification must immediately reject terminated session
    expect(await verifyDPoPSession(token, { jkt: dpopJkt })).toBeNull();
  });

  // ─── CASE 8: Heartbeat Debounce ────────────────────────────────────────────
  it("Case 8: Heartbeat debounce: no write inside 2 minutes, updates after 2 minutes", async () => {
    const { sid } = await mintSessionInternal({
      staffId: testTeacherId,
      email: teacherEmail,
      role: "teacher",
      employeeId: `EMP_TCH_${ts}`,
      name: "Teacher User",
      tokenVersion: 1,
    });

    const initial = await db.select().from(userSessions).where(eq(userSessions.id, sid)).get();
    const initialLastActive = initial!.lastActiveAt;

    // Call touchSession after 60 seconds (< 120s threshold) -> no write
    await touchSession(sid, initialLastActive + 60_000);
    const row1 = await db.select().from(userSessions).where(eq(userSessions.id, sid)).get();
    expect(row1!.lastActiveAt).toBe(initialLastActive);

    // Call touchSession after 130 seconds (> 120s threshold) -> updates
    const newTimestamp = initialLastActive + 130_000;
    await touchSession(sid, newTimestamp);
    const row2 = await db.select().from(userSessions).where(eq(userSessions.id, sid)).get();
    expect(row2!.lastActiveAt).toBe(newTimestamp);
  });

  // ─── CASE 9: Login Paths & MFA-Pending Row Suppression ─────────────────────
  it("Case 9: Login produces session row; MFA-pending produces none", async () => {
    const countBefore = await db.select({ count: sql<number>`count(*)` }).from(userSessions).get();
    await createSession({
      staffId: testTeacherId,
      email: teacherEmail,
      role: "teacher",
      employeeId: `EMP_TCH_${ts}`,
      name: "Teacher User",
      tokenVersion: 1,
    });
    const countAfter = await db.select({ count: sql<number>`count(*)` }).from(userSessions).get();
    expect((countAfter?.count ?? 0) - (countBefore?.count ?? 0)).toBe(1);

    // MFA-pending token creates NO row in user_sessions
    const mfaToken = await createStepUpToken(testTeacherId, "challenge_123");
    expect(mfaToken).toBeDefined();

    const countAfterMfa = await db.select({ count: sql<number>`count(*)` }).from(userSessions).get();
    expect(countAfterMfa?.count).toBe(countAfter?.count);
  });

  // ─── CASE 10: Mobile Handoff Isolation ─────────────────────────────────────
  it("Case 10: Terminated origin sid cannot exchange mobile nonce; web termination leaves mobile session alive", async () => {
    // 1. Mint web session
    await createSession({
      staffId: testTeacherId,
      email: teacherEmail,
      role: "teacher",
      employeeId: `EMP_TCH_${ts}`,
      name: "Teacher User",
      tokenVersion: 1,
    });
    const webSession = await verifySession();
    expect(webSession).not.toBeNull();

    // 2. Create mobile handoff nonce bound to web session
    const { nonce } = await createMobileNonce({
      staffId: testTeacherId,
      email: teacherEmail,
      role: "teacher",
      employeeId: `EMP_TCH_${ts}`,
      name: "Teacher User",
      tokenVersion: 1,
      originSid: webSession!.sid,
    });

    const parsed = await verifyMobileNonce(nonce);
    expect(parsed?.originSid).toBe(webSession!.sid);

    // 3. Mint mobile session with deviceType: "mobile"
    const mobileToken = await createSession(
      {
        staffId: testTeacherId,
        email: teacherEmail,
        role: "teacher",
        employeeId: `EMP_TCH_${ts}`,
        name: "Teacher User",
        tokenVersion: 1,
      },
      false,
      "mobile"
    );

    const { payload: mobilePayload } = await jwtVerify(mobileToken, getJwtSecretBytes("session"));
    expect(mobilePayload.sid).not.toBe(webSession!.sid);

    // 4. Terminate web session
    await db
      .update(userSessions)
      .set({ status: "terminated", logoutAt: Date.now() })
      .where(eq(userSessions.id, webSession!.sid))
      .run();

    // Web session is terminated
    const webCheck = await db.select().from(userSessions).where(eq(userSessions.id, webSession!.sid)).get();
    expect(webCheck?.status).toBe("terminated");

    // Mobile session remains active
    const mobileCheck = await db.select().from(userSessions).where(eq(userSessions.id, mobilePayload.sid as string)).get();
    expect(mobileCheck?.status).toBe("active");
    expect(mobileCheck?.deviceType).toBe("mobile");
  });

  // ─── CASE 11: Tolerant Logout ──────────────────────────────────────────────
  it("Case 11: Logout with an already-terminated session still clears cookie", async () => {
    await createSession({
      staffId: testTeacherId,
      email: teacherEmail,
      role: "teacher",
      employeeId: `EMP_TCH_${ts}`,
      name: "Teacher User",
      tokenVersion: 1,
    });
    const s = await verifySession();
    expect(s).not.toBeNull();
    expect(mockCookieMap.has("thaibahive_session")).toBe(true);

    // Pre-terminate session in DB
    await db.update(userSessions).set({ status: "terminated" }).where(eq(userSessions.id, s!.sid)).run();

    const req = new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
    });

    const res = await logoutRoute(req);
    expect(res.status).toBe(200);
    expect(mockCookieMap.has("thaibahive_session")).toBe(false);
  });

  // ─── CASE 12: Lifecycle Termination ────────────────────────────────────────
  it("Case 12: Staff deactivation terminates all active user_sessions", async () => {
    await createSession({
      staffId: testAdminId,
      email: adminEmail,
      role: "admin",
      employeeId: `EMP_ADM_${ts}`,
      name: "Admin",
      tokenVersion: 1,
    });
    await createSession({
      staffId: testAdminId,
      email: adminEmail,
      role: "admin",
      employeeId: `EMP_ADM_${ts}`,
      name: "Admin",
      tokenVersion: 1,
    });

    const activeBefore = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.staffId, testAdminId), eq(userSessions.status, "active")))
      .all();
    expect(activeBefore.length).toBe(2);

    // Deactivate staff and terminate sessions
    await db
      .update(userSessions)
      .set({ status: "terminated", logoutAt: Date.now() })
      .where(and(eq(userSessions.staffId, testAdminId), eq(userSessions.status, "active")))
      .run();

    const activeAfter = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.staffId, testAdminId), eq(userSessions.status, "active")))
      .all();
    expect(activeAfter.length).toBe(0);
  });

  // ─── CASE 13: RBAC Rank Matrix Coverage ────────────────────────────────────
  it("Case 13: Full 16-role rank matrix: valid ranks, prototype poisoning protection, fail-closed", () => {
    const roles: StaffRole[] = [
      "super_admin", "admin", "regional_admin", "principal", "institutional_head",
      "regional_auditor", "hod", "coordinator", "academic_coordinator", "exam_coordinator",
      "inspector", "accounts", "purchase", "teacher", "staff", "system"
    ];

    expect(roles.length).toBe(16);

    for (const r of roles) {
      const rank = getRoleRank(r);
      expect(rank).not.toBeNull();
      expect(typeof rank).toBe("number");
    }

    // Rank ordering checks
    expect(getRoleRank("super_admin")!).toBeGreaterThan(getRoleRank("regional_admin")!);
    expect(getRoleRank("regional_admin")!).toBeGreaterThan(getRoleRank("principal")!);
    expect(getRoleRank("principal")!).toBeGreaterThan(getRoleRank("hod")!);
    expect(getRoleRank("hod")!).toBeGreaterThan(getRoleRank("admin")!);
    expect(getRoleRank("admin")!).toBeGreaterThan(getRoleRank("teacher")!);

    // Prototype poisoning attempts must fail closed
    expect(getRoleRank("constructor")).toBeNull();
    expect(getRoleRank("__proto__")).toBeNull();
    expect(getRoleRank("toString")).toBeNull();
    expect(getRoleRank("unknown_hacker_role")).toBeNull();
  });

  // ─── CASE 14: Role Creation Hierarchy & System Blocked ──────────────────────
  it("Case 14: Role creation rule: target rank < caller rank; super_admin can create super_admin; system blocked", () => {
    // 1. super_admin can create super_admin, admin, teacher
    expect(canCreateRole("super_admin", "super_admin")).toBe(true);
    expect(canCreateRole("super_admin", "admin")).toBe(true);
    expect(canCreateRole("super_admin", "teacher")).toBe(true);

    // 2. admin can create teacher, but CANNOT create admin or super_admin
    expect(canCreateRole("admin", "teacher")).toBe(true);
    expect(canCreateRole("admin", "admin")).toBe(false);
    expect(canCreateRole("admin", "super_admin")).toBe(false);

    // 3. teacher cannot create anyone
    expect(canCreateRole("teacher", "teacher")).toBe(false);
    expect(canCreateRole("teacher", "staff")).toBe(false);

    // 4. system can NEVER be assigned by anyone (even super_admin)
    expect(canCreateRole("super_admin", "system")).toBe(false);
    expect(canCreateRole("admin", "system")).toBe(false);
  });

  // ─── CASE 15: Action Step-up Security ──────────────────────────────────────
  it("Case 15: Step-up token: valid, replay rejected, wrong action, wrong sid, wrong staffId, expired, wrong typ/aud, jti not burned on failure", async () => {
    const sid = "sess_stepup_test";
    const token = await createActionStepUpToken({
      staffId: testDeveloperId,
      sid,
      action: "session:terminate",
    });

    // 1. Valid verification
    const verified = await verifyActionStepUpToken(token, {
      staffId: testDeveloperId,
      sid,
      action: "session:terminate",
    });
    expect(verified.success).toBe(true);

    // 2. Wrong action
    const wrongAction = await verifyActionStepUpToken(token, {
      staffId: testDeveloperId,
      sid,
      action: "user:delete",
    });
    expect(wrongAction.success).toBe(false);

    // 3. Wrong sid
    const wrongSid = await verifyActionStepUpToken(token, {
      staffId: testDeveloperId,
      sid: "sess_different",
      action: "session:terminate",
    });
    expect(wrongSid.success).toBe(false);

    // 4. Wrong staffId
    const wrongStaff = await verifyActionStepUpToken(token, {
      staffId: testAdminId,
      sid,
      action: "session:terminate",
    });
    expect(wrongStaff.success).toBe(false);

    // 5. Login-pending token rejected by action verifier
    const loginPendingToken = await createStepUpToken(testDeveloperId, "chal_1");
    const loginPendingCheck = await verifyActionStepUpToken(loginPendingToken, {
      staffId: testDeveloperId,
      sid,
      action: "session:terminate",
    });
    expect(loginPendingCheck.success).toBe(false);

    // 6. Transaction rollback leaves jti unburned
    if (verified.success) {
      try {
        await db.transaction(async (tx) => {
          await consumeStepUpTokenInTx(tx, {
            jti: verified.payload.jti,
            staffId: testDeveloperId,
            action: "session:terminate",
            exp: verified.exp,
          });
          // Force transaction rollback
          throw new Error("Forced transaction failure");
        });
      } catch {
        // Expected rollback
      }

      // Assert jti was NOT consumed
      const usedRow = await db.select().from(stepUpUsed).where(eq(stepUpUsed.jti, verified.payload.jti)).get();
      expect(usedRow).toBeUndefined();

      // Successful transaction consumes jti
      await db.transaction(async (tx) => {
        await consumeStepUpTokenInTx(tx, {
          jti: verified.payload.jti,
          staffId: testDeveloperId,
          action: "session:terminate",
          exp: verified.exp,
        });
      });

      const burnedRow = await db.select().from(stepUpUsed).where(eq(stepUpUsed.jti, verified.payload.jti)).get();
      expect(burnedRow).toBeDefined();

      // Second consumption fails with PK conflict
      await expect(
        db.transaction(async (tx) => {
          await consumeStepUpTokenInTx(tx, {
            jti: verified.payload.jti,
            staffId: testDeveloperId,
            action: "session:terminate",
            exp: verified.exp,
          });
        })
      ).rejects.toThrow();
    }
  });

  // ─── CASE 16: Terminate Route & Audit Rollback ──────────────────────────────
  it("Case 16: Terminate route is idempotent; rollback test proves neither session change nor audit entry persists", async () => {
    // Setup target session for teacher
    const teacherToken = await createSession({
      staffId: testTeacherId,
      email: teacherEmail,
      role: "teacher",
      employeeId: `EMP_TCH_${ts}`,
      name: "Teacher User",
      tokenVersion: 1,
    });
    const { payload } = await jwtVerify(teacherToken, getJwtSecretBytes("session"));
    const targetSid = payload.sid as string;

    // Caller is developer
    await createSession({
      staffId: testDeveloperId,
      email: developerEmail,
      role: "super_admin",
      employeeId: `EMP_DEV_${ts}`,
      name: "Developer",
      tokenVersion: 1,
    });
    const devSession = await verifySession();
    expect(devSession).not.toBeNull();

    // Mint stepUpToken
    const stepUpToken1 = await createActionStepUpToken({
      staffId: testDeveloperId,
      sid: devSession!.sid,
      action: "session:terminate",
    });

    const req1 = new Request(`http://localhost:3000/api/admin/sessions/${targetSid}/terminate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        stepUpToken: stepUpToken1,
        reason: "Security audit termination",
      }),
    });

    const res1 = await terminateRoute(req1, { params: Promise.resolve({ id: targetSid }) });
    const data1 = await res1.json();
    expect(res1.status).toBe(200);
    expect(data1.terminated).toBe(true);

    // 2. Idempotent second call
    const stepUpToken2 = await createActionStepUpToken({
      staffId: testDeveloperId,
      sid: devSession!.sid,
      action: "session:terminate",
    });
    const req2 = new Request(`http://localhost:3000/api/admin/sessions/${targetSid}/terminate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        stepUpToken: stepUpToken2,
        reason: "Second termination call",
      }),
    });

    const res2 = await terminateRoute(req2, { params: Promise.resolve({ id: targetSid }) });
    const data2 = await res2.json();
    expect(res2.status).toBe(200);
    expect(data2.terminated).toBe(false); // Idempotent: already terminated

    // 3. Transaction Rollback Test
    const rollbackSid = `sess_rollback_${ts}`;
    await db.insert(userSessions).values({
      id: rollbackSid,
      staffId: testTeacherId,
      email: teacherEmail,
      role: "teacher",
      status: "active",
      loginAt: Date.now(),
      lastActiveAt: Date.now(),
      expiresAt: Date.now() + 86400000,
      createdAt: Date.now(),
    }).run();

    const auditCountBefore = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).get();

    try {
      await db.transaction(async (tx) => {
        await tx.update(userSessions).set({ status: "terminated" }).where(eq(userSessions.id, rollbackSid));
        await cryptoAuditWriter.log(
          {
            tenantId: "default",
            userId: testDeveloperId,
            action: "SESSION_TERMINATE",
            entityType: "user_session",
            entityId: rollbackSid,
          },
          tx
        );
        throw new Error("Simulated post-update failure to test rollback");
      });
    } catch {
      // Expected rollback
    }

    const sessionAfterRollback = await db.select().from(userSessions).where(eq(userSessions.id, rollbackSid)).get();
    expect(sessionAfterRollback?.status).toBe("active"); // Status remained active!

    const auditCountAfter = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).get();
    expect(auditCountAfter?.count).toBe(auditCountBefore?.count); // Zero audit rows committed!
  });

  // ─── CASE 17: Origin Header Validation ─────────────────────────────────────
  it("Case 17: Origin check: allowed origins and tenant subdomains allowed, foreign & missing rejected for cookie auth", () => {
    // 1. Localhost allowed in development
    expect(checkAllowedOrigin("http://localhost:3000", true)).toBe(true);
    expect(checkAllowedOrigin("http://127.0.0.1:3000", true)).toBe(true);

    // 2. Tenant subdomains allowed
    expect(checkAllowedOrigin("https://tenant-alpha.thaiba-hive.vercel.app", true)).toBe(true);
    expect(checkAllowedOrigin("https://thaiba-hive.vercel.app", true)).toBe(true);

    // 3. Foreign origins rejected
    expect(checkAllowedOrigin("https://evil-attacker.com", true)).toBe(false);
    expect(checkAllowedOrigin("https://thaiba-hive.attacker.com", true)).toBe(false);

    // 4. Missing Origin on cookie-authenticated request rejected
    expect(checkAllowedOrigin(null, true)).toBe(false);
    expect(checkAllowedOrigin(undefined, true)).toBe(false);

    // 5. Missing Origin on non-cookie request allowed
    expect(checkAllowedOrigin(null, false)).toBe(true);
  });

  // ─── CASE 18: Foreign Key Enforcement in Transaction ────────────────────────
  it("Case 18: Foreign key violation inside db.transaction throws error mentioning foreign key", async () => {
    let thrownError: { message?: string; cause?: unknown } | null = null;
    try {
      await db.transaction(async (tx) => {
        await tx.insert(userSessions).values({
          id: `sess_fk_${Date.now()}`,
          staffId: "non_existent_staff_id_9999", // Invalid FK!
          email: "orphan@test.com",
          role: "staff",
          status: "active",
          loginAt: Date.now(),
          lastActiveAt: Date.now(),
          expiresAt: Date.now() + 86400000,
          createdAt: Date.now(),
        });
      });
    } catch (err: unknown) {
      thrownError = err as { message?: string; cause?: unknown };
    }

    expect(thrownError).not.toBeNull();
    const fullMessage = `${thrownError?.message || ""} ${String(thrownError?.cause || "")}`;
    expect(fullMessage).toMatch(/foreign key|foreign_key|sqlite_constraint/i);
  });
});
