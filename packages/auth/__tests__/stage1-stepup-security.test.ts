import { createSession } from "../session";
import { db } from "@thaiba/db";
import { staff, webauthnCredentials, credentialChallenges, userSessions } from "@thaiba/db/schema";
import { isAuthorizedDeveloper } from "../roles";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { POST as rawStepUpChallengeRoute } from "../../../src/app/api/auth/step-up/challenge/route";
import { POST as rawStepUpVerifyRoute } from "../../../src/app/api/auth/step-up/verify/route";
import { POST as rawTerminateSessionRoute } from "../../../src/app/api/admin/sessions/[id]/terminate/route";

const stepUpChallengeRoute = (req: any) => (rawStepUpChallengeRoute as any)(req);
const stepUpVerifyRoute = (req: any) => (rawStepUpVerifyRoute as any)(req);
const terminateSessionRoute = (req: any, ctx: any) => (rawTerminateSessionRoute as any)(req, ctx);

const mockCookieMap = new Map<string, { value: string }>();
const mockHeaderMap = new Map<string, string>();

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockImplementation(async () => ({
    get: (name: string) => mockCookieMap.get(name),
    set: (name: string, value: string) => mockCookieMap.set(name, { value }),
    delete: (name: string) => mockCookieMap.delete(name),
  })),
  headers: jest.fn().mockImplementation(async () => ({
    get: (name: string) => mockHeaderMap.get(name.toLowerCase()) || null,
  })),
}));

describe("Critical Security Gate: Step-Up Factor Verification (C1 & C2)", () => {
  const ts = Date.now();
  const devEmail = `dev_c1_${ts}@thaiba.com`;
  const passkeyEmail = `passkey_user_${ts}@thaiba.com`;
  const emailOtpEmail = `email_otp_user_${ts}@thaiba.com`;
  const pwdEmail = `pwd_user_${ts}@thaiba.com`;
  const targetSubordinateEmail = `subordinate_${ts}@thaiba.com`;

  const devStaffId = `staff_dev_${ts}`;
  const passkeyStaffId = `staff_pk_${ts}`;
  const emailOtpStaffId = `staff_otp_${ts}`;
  const pwdStaffId = `staff_pwd_${ts}`;
  const targetSubordinateStaffId = `staff_sub_${ts}`;

  let keyPair: crypto.KeyPairSyncResult<string, string>;
  const credentialId = `cred_id_${crypto.randomBytes(16).toString("base64url")}`;
  const credentialRowId = `row_uuid_${crypto.randomUUID()}`; // Row id is explicitly different from credentialId

  beforeAll(async () => {
    process.env.DEVELOPER_EMAILS = devEmail;
    process.env.RP_ID = "localhost";

    keyPair = crypto.generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const now = new Date().toISOString();
    const bcryptPasswordHash = "$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm"; // password: "ValidPassword123!"

    // 1. Developer Staff
    await db.insert(staff).values({
      id: devStaffId,
      email: devEmail,
      employeeId: `EMP_DEV_${ts}`,
      firstName: "Authorized",
      lastName: "Developer",
      role: "super_admin",
      isActive: true,
      tokenVersion: 1,
      emailVerifiedAt: now,
      passwordHash: bcryptPasswordHash,
    }).run();

    // 2. Passkey-Enrolled Staff
    await db.insert(staff).values({
      id: passkeyStaffId,
      email: passkeyEmail,
      employeeId: `EMP_PK_${ts}`,
      firstName: "Passkey",
      lastName: "User",
      role: "super_admin",
      isActive: true,
      tokenVersion: 1,
      emailVerifiedAt: now,
      passwordHash: bcryptPasswordHash,
    }).run();

    await db.insert(webauthnCredentials).values({
      id: credentialRowId,
      staffId: passkeyStaffId,
      credentialId,
      publicKey: keyPair.publicKey,
      counter: 0,
      transports: JSON.stringify(["internal"]),
      algorithm: -7,
      backupEligible: true,
      backupState: true,
      deviceName: "platform",
      createdAt: now,
      lastUsedAt: now,
    } as any).run();

    // 3. Email OTP-Enrolled Staff
    await db.insert(staff).values({
      id: emailOtpStaffId,
      email: emailOtpEmail,
      employeeId: `EMP_OTP_${ts}`,
      firstName: "EmailOTP",
      lastName: "User",
      role: "super_admin",
      isActive: true,
      tokenVersion: 1,
      emailVerifiedAt: now,
      passwordHash: bcryptPasswordHash,
    }).run();

    await db.insert(credentialChallenges).values({
      id: crypto.randomUUID(),
      staffId: emailOtpStaffId,
      challenge: "email_otp_marker",
      type: "email_otp_enrolled",
      expiresAt: "9999-12-31T23:59:59.999Z",
    }).run();

    // 4. Password-Only Staff
    await db.insert(staff).values({
      id: pwdStaffId,
      email: pwdEmail,
      employeeId: `EMP_PWD_${ts}`,
      firstName: "Password",
      lastName: "User",
      role: "super_admin",
      isActive: true,
      tokenVersion: 1,
      emailVerifiedAt: now,
      passwordHash: bcryptPasswordHash,
    }).run();

    // 5. Target Subordinate Staff
    await db.insert(staff).values({
      id: targetSubordinateStaffId,
      email: targetSubordinateEmail,
      employeeId: `EMP_SUB_${ts}`,
      firstName: "Subordinate",
      lastName: "Staff",
      role: "staff",
      isActive: true,
      tokenVersion: 1,
      emailVerifiedAt: now,
    }).run();
  });

  afterAll(async () => {
    try {
      await db.delete(webauthnCredentials).where(eq(webauthnCredentials.id, credentialRowId)).run();
      await db.delete(userSessions).where(eq(userSessions.staffId, devStaffId)).run();
      await db.delete(userSessions).where(eq(userSessions.staffId, passkeyStaffId)).run();
      await db.delete(userSessions).where(eq(userSessions.staffId, emailOtpStaffId)).run();
      await db.delete(userSessions).where(eq(userSessions.staffId, pwdStaffId)).run();
      await db.delete(userSessions).where(eq(userSessions.staffId, targetSubordinateStaffId)).run();
      await db.delete(credentialChallenges).where(eq(credentialChallenges.staffId, passkeyStaffId)).run();
      await db.delete(credentialChallenges).where(eq(credentialChallenges.staffId, emailOtpStaffId)).run();
      await db.delete(staff).where(eq(staff.id, devStaffId)).run();
      await db.delete(staff).where(eq(staff.id, passkeyStaffId)).run();
      await db.delete(staff).where(eq(staff.id, emailOtpStaffId)).run();
      await db.delete(staff).where(eq(staff.id, pwdStaffId)).run();
      await db.delete(staff).where(eq(staff.id, targetSubordinateStaffId)).run();
    } catch {}
  });

  beforeEach(() => {
    mockCookieMap.clear();
    mockHeaderMap.clear();
  });

  function createAssertion(params: {
    challenge: string;
    origin?: string;
    rpId?: string;
    flags?: number;
    signCount?: number;
    privateKey?: string;
  }) {
    const origin = params.origin || "http://localhost:3000";
    const hostname = params.rpId || "localhost";
    const clientDataJSON = JSON.stringify({
      type: "webauthn.get",
      challenge: params.challenge,
      origin,
      crossOrigin: false,
    });

    const rpIdHash = crypto.createHash("sha256").update(hostname).digest();
    const flags = Buffer.from([params.flags ?? 0x05]); // UP (0x01) | UV (0x04)
    const signCountBuf = Buffer.alloc(4);
    signCountBuf.writeUInt32BE(params.signCount ?? 1, 0);

    const authenticatorData = Buffer.concat([rpIdHash, flags, signCountBuf]);
    const clientDataHash = crypto.createHash("sha256").update(Buffer.from(clientDataJSON, "utf-8")).digest();
    const signedData = Buffer.concat([authenticatorData, clientDataHash]);

    const signer = crypto.createSign("SHA256");
    signer.update(signedData);
    const signature = signer.sign(params.privateKey || keyPair.privateKey);

    return {
      clientDataJSON: Buffer.from(clientDataJSON).toString("base64url"),
      authenticatorData: authenticatorData.toString("base64url"),
      signature: signature.toString("base64url"),
    };
  }

  // ─── C2: isAuthorizedDeveloper Fail-Closed Validation ───────────────────────
  it("C2.1: isAuthorizedDeveloper fails closed when emailVerifiedAt is null, undefined, or missing", () => {
    expect(isAuthorizedDeveloper({ email: devEmail, emailVerifiedAt: null, role: "super_admin" })).toBe(false);
    expect(isAuthorizedDeveloper({ email: devEmail, emailVerifiedAt: undefined as any, role: "super_admin" })).toBe(false);
    expect(isAuthorizedDeveloper(null)).toBe(false);
    expect(isAuthorizedDeveloper(undefined)).toBe(false);
    expect(isAuthorizedDeveloper({ email: "unauthorized@test.com", emailVerifiedAt: new Date().toISOString(), role: "super_admin" })).toBe(false);
    expect(isAuthorizedDeveloper({ email: devEmail, emailVerifiedAt: new Date().toISOString(), role: "super_admin" })).toBe(true);
  });

  // ─── C1.1: Developer accounts cannot use OTP or password (returns 403) ─────
  it("C1.1: Developer accounts cannot use OTP or password for step-up (returns 403)", async () => {
    const token = await createSession({
      staffId: devStaffId,
      email: devEmail,
      role: "super_admin",
      employeeId: `EMP_DEV_${ts}`,
      name: "Authorized Developer",
      tokenVersion: 1,
    });
    mockCookieMap.set("thaibahive_session", { value: token });

    const reqOtp = new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "email_otp",
        otp: "123456",
      }),
    });
    const resOtp = await stepUpVerifyRoute(reqOtp);
    expect(resOtp.status).toBe(403);
    const dataOtp = await resOtp.json();
    expect(dataOtp.error).toContain("Passkey required");

    const reqPwd = new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "password",
        password: "ValidPassword123!",
      }),
    });
    const resPwd = await stepUpVerifyRoute(reqPwd);
    expect(resPwd.status).toBe(403);
    const dataPwd = await resPwd.json();
    expect(dataPwd.error).toContain("Passkey required");
  });

  // ─── C1.2: Passkey-enrolled accounts cannot downgrade to OTP or password ───
  it("C1.2: Passkey-enrolled account cannot downgrade to OTP or password (returns 403)", async () => {
    const token = await createSession({
      staffId: passkeyStaffId,
      email: passkeyEmail,
      role: "super_admin",
      employeeId: `EMP_PK_${ts}`,
      name: "Passkey User",
      tokenVersion: 1,
    });
    mockCookieMap.set("thaibahive_session", { value: token });

    const reqOtp = new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "email_otp",
        otp: "123456",
      }),
    });
    const resOtp = await stepUpVerifyRoute(reqOtp);
    expect(resOtp.status).toBe(403);

    const reqPwd = new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "password",
        password: "ValidPassword123!",
      }),
    });
    const resPwd = await stepUpVerifyRoute(reqPwd);
    expect(resPwd.status).toBe(403);
  });

  // ─── C1.3: OTP-enrolled accounts cannot downgrade to password ──────────────
  it("C1.3: OTP-enrolled account cannot downgrade to password (returns 403)", async () => {
    const token = await createSession({
      staffId: emailOtpStaffId,
      email: emailOtpEmail,
      role: "super_admin",
      employeeId: `EMP_OTP_${ts}`,
      name: "Email OTP User",
      tokenVersion: 1,
    });
    mockCookieMap.set("thaibahive_session", { value: token });

    const reqPwd = new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "password",
        password: "ValidPassword123!",
      }),
    });
    const resPwd = await stepUpVerifyRoute(reqPwd);
    expect(resPwd.status).toBe(403);
    const data = await resPwd.json();
    expect(data.error).toContain("OTP required");
  });

  // ─── C1.4: Authentic WebAuthn Passkey Step-Up succeeds ───────────────────────
  it("C1.4: Authentic WebAuthn Passkey Step-Up succeeds and returns string stepUpToken", async () => {
    const token = await createSession({
      staffId: passkeyStaffId,
      email: passkeyEmail,
      role: "super_admin",
      employeeId: `EMP_PK_${ts}`,
      name: "Passkey User",
      tokenVersion: 1,
    });
    mockCookieMap.set("thaibahive_session", { value: token });

    const chalReq = new Request("http://localhost:3000/api/auth/step-up/challenge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "session:terminate" }),
    });
    const chalRes = await stepUpChallengeRoute(chalReq);
    expect(chalRes.status).toBe(200);
    const chalData = await chalRes.json();
    expect(chalData.challenge).toBeDefined();

    const assertion = createAssertion({
      challenge: chalData.challenge,
      flags: 0x05, // UP | UV
      signCount: 1,
    });

    const verifyReq = new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "passkey",
        challenge: chalData.challenge,
        passkeyCredential: {
          id: credentialId,
          rawId: credentialId,
          response: assertion,
        },
      }),
    });

    const verifyRes = await stepUpVerifyRoute(verifyReq);
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.success).toBe(true);
    expect(typeof verifyData.stepUpToken).toBe("string");
  });

  // ─── C1.5: Authenticator with signCount = 0 (synced passkey) ─────────────────
  it("C1.5: Authenticator reporting signCount = 0 (synced passkey) succeeds on consecutive invocations", async () => {
    const token = await createSession({
      staffId: passkeyStaffId,
      email: passkeyEmail,
      role: "super_admin",
      employeeId: `EMP_PK_${ts}`,
      name: "Passkey User",
      tokenVersion: 1,
    });
    mockCookieMap.set("thaibahive_session", { value: token });

    await db.update(webauthnCredentials).set({ counter: 0 }).where(eq(webauthnCredentials.id, credentialRowId)).run();

    // Invocations 1 & 2
    for (let i = 1; i <= 2; i++) {
      const chalRes = await stepUpChallengeRoute(new Request("http://localhost:3000/api/auth/step-up/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "session:terminate" }),
      }));
      const { challenge } = await chalRes.json();

      const assertion = createAssertion({
        challenge,
        flags: 0x05,
        signCount: 0,
      });

      const verifyRes = await stepUpVerifyRoute(new Request("http://localhost:3000/api/auth/step-up/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "session:terminate",
          factor: "passkey",
          challenge,
          passkeyCredential: { id: credentialId, rawId: credentialId, response: assertion },
        }),
      }));

      expect(verifyRes.status).toBe(200);
      const data = await verifyRes.json();
      expect(data.success).toBe(true);
      expect(typeof data.stepUpToken).toBe("string");

      const [storedCred] = await db.select().from(webauthnCredentials).where(eq(webauthnCredentials.id, credentialRowId));
      expect(storedCred.counter).toBe(0);
    }
  });

  // ─── C1.6: Negative Edge Cases with Isolated Fresh Challenges ───────────────
  it("C1.6: Passkey assertion rejects wrong challenge, reused challenge, wrong cred, counter rollback, missing UV, foreign origin, forged sig", async () => {
    const token = await createSession({
      staffId: passkeyStaffId,
      email: passkeyEmail,
      role: "super_admin",
      employeeId: `EMP_PK_${ts}`,
      name: "Passkey User",
      tokenVersion: 1,
    });
    mockCookieMap.set("thaibahive_session", { value: token });

    const getFreshChallenge = async () => {
      const chalRes = await stepUpChallengeRoute(new Request("http://localhost:3000/api/auth/step-up/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "session:terminate" }),
      }));
      const chalData = await chalRes.json();
      return chalData.challenge;
    };

    const clearFailures = async () => {
      await db.delete(credentialChallenges).where(
        and(eq(credentialChallenges.staffId, passkeyStaffId), eq(credentialChallenges.type, "step_up_failure"))
      ).run();
    };

    // 1. Wrong challenge fails with 400 "Invalid, expired, or already used challenge"
    await clearFailures();
    const badChalAssertion = createAssertion({ challenge: "wrong_chal_123", flags: 0x05, signCount: 5 });
    const resBadChal = await stepUpVerifyRoute(new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "passkey",
        challenge: "wrong_chal_123",
        passkeyCredential: { id: credentialId, response: badChalAssertion },
      }),
    }));
    expect(resBadChal.status).toBe(400);
    const badChalBody = await resBadChal.json();
    expect(badChalBody.error).toBe("Invalid, expired, or already used challenge");

    // 2. Wrong credential fails with 400 "Credential not registered for this user"
    await clearFailures();
    const chal2 = await getFreshChallenge();
    const chal2Assertion = createAssertion({ challenge: chal2, flags: 0x05, signCount: 5 });
    const resWrongCred = await stepUpVerifyRoute(new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "passkey",
        challenge: chal2,
        passkeyCredential: { id: "unregistered_cred_id", response: chal2Assertion },
      }),
    }));
    expect(resWrongCred.status).toBe(400);
    const wrongCredBody = await resWrongCred.json();
    expect(wrongCredBody.error).toBe("Credential not registered for this user");

    // 3. Missing UV flag (UV = 0) fails with 401 "User presence and user verification (UV) are mandatory"
    await clearFailures();
    const chal3 = await getFreshChallenge();
    const noUvAssertion = createAssertion({ challenge: chal3, flags: 0x01, signCount: 5 }); // UP only
    const resNoUv = await stepUpVerifyRoute(new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "passkey",
        challenge: chal3,
        passkeyCredential: { id: credentialId, response: noUvAssertion },
      }),
    }));
    expect(resNoUv.status).toBe(401);
    const noUvBody = await resNoUv.json();
    expect(noUvBody.error).toBe("User presence and user verification (UV) are mandatory");

    // 4. Foreign origin fails with 401 "Invalid origin in clientDataJSON"
    await clearFailures();
    const chal4 = await getFreshChallenge();
    const foreignOriginAssertion = createAssertion({
      challenge: chal4,
      origin: "https://evil-attacker.com",
      flags: 0x05,
      signCount: 5,
    });
    const resForeign = await stepUpVerifyRoute(new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "passkey",
        challenge: chal4,
        passkeyCredential: { id: credentialId, response: foreignOriginAssertion },
      }),
    }));
    expect(resForeign.status).toBe(401);
    const foreignBody = await resForeign.json();
    expect(foreignBody.error).toBe("Invalid origin in clientDataJSON");

    // 5. Forged signature fails with 401 and DOES NOT bump counter
    await clearFailures();
    const [credBeforeForged] = await db.select().from(webauthnCredentials).where(eq(webauthnCredentials.id, credentialRowId));
    const initialCounter = credBeforeForged.counter;

    const chal5 = await getFreshChallenge();
    const otherKeyPair = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const forgedAssertion = createAssertion({
      challenge: chal5,
      flags: 0x05,
      signCount: initialCounter + 100, // malicious high signCount
      privateKey: otherKeyPair.privateKey.export({ type: "pkcs8", format: "pem" }) as string,
    });
    const resForged = await stepUpVerifyRoute(new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "passkey",
        challenge: chal5,
        passkeyCredential: { id: credentialId, response: forgedAssertion },
      }),
    }));
    expect(resForged.status).toBe(401);
    const forgedBody = await resForged.json();
    expect(forgedBody.error).toBe("Cryptographic signature verification failed");

    // Assert counter remained unchanged despite higher signCount in forged assertion
    const [credAfterForged] = await db.select().from(webauthnCredentials).where(eq(webauthnCredentials.id, credentialRowId));
    expect(credAfterForged.counter).toBe(initialCounter);

    // 6. Valid passkey step-up consumes challenge atomically
    await clearFailures();
    const chal6 = await getFreshChallenge();
    const validAssertion = createAssertion({ challenge: chal6, flags: 0x05, signCount: initialCounter + 10 });
    const resValid = await stepUpVerifyRoute(new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "passkey",
        challenge: chal6,
        passkeyCredential: { id: credentialId, response: validAssertion },
      }),
    }));
    expect(resValid.status).toBe(200);

    // Replay of consumed challenge must fail with 400
    await clearFailures();
    const resReplay = await stepUpVerifyRoute(new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "passkey",
        challenge: chal6,
        passkeyCredential: { id: credentialId, response: validAssertion },
      }),
    }));
    expect(resReplay.status).toBe(400);
    const replayBody = await resReplay.json();
    expect(replayBody.error).toBe("Invalid, expired, or already used challenge");

    // 7. Counter rollback fails with 401
    await clearFailures();
    const chal7 = await getFreshChallenge();
    const rollbackAssertion = createAssertion({ challenge: chal7, flags: 0x05, signCount: initialCounter + 5 }); // DB counter is now initialCounter + 10
    const resRollback = await stepUpVerifyRoute(new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "passkey",
        challenge: chal7,
        passkeyCredential: { id: credentialId, response: rollbackAssertion },
      }),
    }));
    expect(resRollback.status).toBe(401);
    const rollbackData = await resRollback.json();
    expect(rollbackData.error).toContain("rollback");
  });

  // ─── C1.7: Invalid OTP is rejected ──────────────────────────────────────────
  it("C1.7: Hardcoded '123456' OTP is rejected when not generated for the user", async () => {
    const token = await createSession({
      staffId: emailOtpStaffId,
      email: emailOtpEmail,
      role: "super_admin",
      employeeId: `EMP_OTP_${ts}`,
      name: "Email OTP User",
      tokenVersion: 1,
    });
    mockCookieMap.set("thaibahive_session", { value: token });

    const req = new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "email_otp",
        otp: "123456",
      }),
    });
    const res = await stepUpVerifyRoute(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid or expired OTP");
  });

  // ─── C1.8: Valid DB-Persisted OTP passes and rejects replay ────────────────
  it("C1.8: Validly generated OTP passes, returns string stepUpToken, and immediately rejects on reuse", async () => {
    const token = await createSession({
      staffId: emailOtpStaffId,
      email: emailOtpEmail,
      role: "super_admin",
      employeeId: `EMP_OTP_${ts}`,
      name: "Email OTP User",
      tokenVersion: 1,
    });
    mockCookieMap.set("thaibahive_session", { value: token });

    const rawOtp = "849201";
    const otpHash = crypto.createHash("sha256").update(rawOtp).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await db.insert(credentialChallenges).values({
      id: crypto.randomUUID(),
      staffId: emailOtpStaffId,
      challenge: otpHash,
      type: "email_otp",
      expiresAt,
    }).run();

    const req = new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "email_otp",
        otp: rawOtp,
      }),
    });
    const res = await stepUpVerifyRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(typeof data.stepUpToken).toBe("string");

    // Replay fails
    const reqReplay = new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "email_otp",
        otp: rawOtp,
      }),
    });
    const resReplay = await stepUpVerifyRoute(reqReplay);
    expect(resReplay.status).toBe(400);
  });

  // ─── C1.9: 3 consecutive failures trigger lockout (HTTP 429) ────────────────
  it("C1.9: 3 consecutive failed step-up attempts trigger DB-backed lockout (HTTP 429)", async () => {
    const token = await createSession({
      staffId: pwdStaffId,
      email: pwdEmail,
      role: "super_admin",
      employeeId: `EMP_PWD_${ts}`,
      name: "Password User",
      tokenVersion: 1,
    });
    mockCookieMap.set("thaibahive_session", { value: token });

    await db.delete(credentialChallenges).where(
      and(eq(credentialChallenges.staffId, pwdStaffId), eq(credentialChallenges.type, "step_up_failure"))
    ).run();

    // 3 bad password attempts
    for (let i = 1; i <= 3; i++) {
      const res = await stepUpVerifyRoute(new Request("http://localhost:3000/api/auth/step-up/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "session:terminate",
          factor: "password",
          password: "WrongPassword123!",
        }),
      }));
      expect(res.status).toBe(401);
    }

    // 4th attempt is locked out with 429
    const lockRes = await stepUpVerifyRoute(new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "password",
        password: "ValidPassword123!",
      }),
    }));
    expect(lockRes.status).toBe(429);
    const lockData = await lockRes.json();
    expect(lockData.error).toContain("Locked out for 15 minutes");
  });

  // ─── C1.10: End-to-End Integration & Replay Prevention ───────────────────────
  it("C1.10: End-to-end integration: challenge -> passkey verify -> session terminate, and token replay returns 403", async () => {
    // 1. Caller is super_admin (passkeyStaffId)
    const callerToken = await createSession({
      staffId: passkeyStaffId,
      email: passkeyEmail,
      role: "super_admin",
      employeeId: `EMP_PK_C1_${ts}`,
      name: "Caller Admin",
      tokenVersion: 1,
    });
    mockCookieMap.set("thaibahive_session", { value: callerToken });
    mockHeaderMap.set("origin", "http://localhost:3000");

    // 2. Target subordinate session to terminate
    const targetToken = await createSession({
      staffId: targetSubordinateStaffId,
      email: targetSubordinateEmail,
      role: "staff",
      employeeId: `EMP_SUB_C1_${ts}`,
      name: "Subordinate Target",
      tokenVersion: 1,
    });
    const { jwtVerify } = await import("jose");
    const { getJwtSecretBytes } = await import("../config");
    const { payload: targetPayload } = await jwtVerify(targetToken, getJwtSecretBytes("session"));
    const targetSid = targetPayload.sid as string;

    // 3. Request challenge for action "session:terminate"
    mockCookieMap.set("thaibahive_session", { value: callerToken });
    const chalReq = new Request("http://localhost:3000/api/auth/step-up/challenge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "session:terminate" }),
    });
    const chalRes = await stepUpChallengeRoute(chalReq);
    expect(chalRes.status).toBe(200);
    const chalData = await chalRes.json();

    // 4. Generate valid assertion
    const assertion = createAssertion({
      challenge: chalData.challenge,
      flags: 0x05,
      signCount: 50,
    });

    // 5. Verify step-up and obtain stepUpToken string
    const verifyReq = new Request("http://localhost:3000/api/auth/step-up/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "session:terminate",
        factor: "passkey",
        challenge: chalData.challenge,
        passkeyCredential: {
          id: credentialId,
          rawId: credentialId,
          response: assertion,
        },
      }),
    });
    const verifyRes = await stepUpVerifyRoute(verifyReq);
    expect(verifyRes.status).toBe(200);
    const { stepUpToken } = await verifyRes.json();
    expect(typeof stepUpToken).toBe("string");

    // 6. Call POST /api/admin/sessions/[id]/terminate using the stepUpToken
    const terminateReq = new Request(`http://localhost:3000/api/admin/sessions/${targetSid}/terminate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        stepUpToken,
        reason: "Administrative security rotation",
      }),
    });

    const terminateRes = await terminateSessionRoute(terminateReq, {
      params: Promise.resolve({ id: targetSid }),
    });
    expect(terminateRes.status).toBe(200);
    const terminateData = await terminateRes.json();
    expect(terminateData.success).toBe(true);
    expect(terminateData.terminated).toBe(true);

    // 7. Verify target session is terminated in DB
    const [dbSession] = await db.select().from(userSessions).where(eq(userSessions.id, targetSid));
    expect(dbSession.status).toBe("terminated");

    // 8. Replay of same stepUpToken on terminate returns 403
    const replayTerminateReq = new Request(`http://localhost:3000/api/admin/sessions/${targetSid}/terminate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        stepUpToken,
        reason: "Administrative security rotation replay",
      }),
    });

    const replayTerminateRes = await terminateSessionRoute(replayTerminateReq, {
      params: Promise.resolve({ id: targetSid }),
    });
    expect(replayTerminateRes.status).toBe(403);
    const replayTerminateData = await replayTerminateRes.json();
    expect(replayTerminateData.error).toContain("replay detected");
  });
});
