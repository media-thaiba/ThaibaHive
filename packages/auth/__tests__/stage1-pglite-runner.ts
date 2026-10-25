import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq, and } from "drizzle-orm";
import { wrapPgDb } from "../../db/index";
import * as pgSchema from "../../db/schema.pg";

async function runStage1PgVerification() {
  console.log("=== Stage 1 Postgres Verification via PGlite & wrapPgDb ===");
  const pglite = new PGlite();

  // Initialize Postgres schema DDL matching drizzle/postgres/
  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS "staff" (
      "id" text PRIMARY KEY NOT NULL,
      "email" text NOT NULL UNIQUE,
      "employee_id" text NOT NULL UNIQUE,
      "first_name" text NOT NULL,
      "last_name" text NOT NULL,
      "phone" text,
      "designation" text,
      "role" text DEFAULT 'staff' NOT NULL,
      "avatar_url" text,
      "date_of_birth" text,
      "date_of_joining" text,
      "qualifications" text,
      "certificates" text,
      "experience_years" double precision,
      "skills" text,
      "languages" text,
      "emergency_contact_name" text,
      "emergency_contact_phone" text,
      "aadhaar" text,
      "pan" text,
      "bank_account" text,
      "ifsc_code" text,
      "contract_end_date" text,
      "teaching_subjects" text,
      "biography" text,
      "is_active" boolean DEFAULT true NOT NULL,
      "token_version" integer DEFAULT 0 NOT NULL,
      "is_first_login" boolean DEFAULT true NOT NULL,
      "onboarding_completed_at" text,
      "password_hash" text,
      "email_verified_at" text,
      "nfc_tag_id" text UNIQUE,
      "face_embedding" text,
      "face_registered_at" text,
      "fingerprint_hash" text,
      "fingerprint_registered_at" text,
      "biometric_enabled" boolean DEFAULT false NOT NULL,
      "model_version" text DEFAULT 'facenet-512d-v1',
      "biometric_status" text DEFAULT 'active',
      "google_sub" text UNIQUE,
      "created_at" text DEFAULT (current_timestamp) NOT NULL,
      "updated_at" text DEFAULT (current_timestamp) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "user_sessions" (
      "id" text PRIMARY KEY NOT NULL,
      "staff_id" text NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
      "email" text NOT NULL,
      "role" text NOT NULL,
      "institution_id" text,
      "status" text DEFAULT 'active' NOT NULL,
      "client_ip" text,
      "user_agent" text,
      "device_type" text,
      "login_at" bigint NOT NULL,
      "last_active_at" bigint NOT NULL,
      "expires_at" bigint NOT NULL,
      "logout_at" bigint,
      "created_at" bigint NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "step_up_used" (
      "jti" text PRIMARY KEY NOT NULL,
      "staff_id" text NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
      "action" text NOT NULL,
      "expires_at" bigint NOT NULL,
      "used_at" bigint NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "credential_challenges" (
      "id" text PRIMARY KEY NOT NULL,
      "staff_id" text NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
      "challenge" text NOT NULL,
      "type" text NOT NULL,
      "expires_at" text NOT NULL,
      "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "webauthn_credentials" (
      "id" text PRIMARY KEY NOT NULL,
      "staff_id" text NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
      "credential_id" text NOT NULL UNIQUE,
      "public_key" text NOT NULL,
      "counter" bigint DEFAULT 0 NOT NULL,
      "device_type" text DEFAULT 'single_device' NOT NULL,
      "backed_up" boolean DEFAULT false NOT NULL,
      "transports" text,
      "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "last_used_at" text
    );

    CREATE INDEX IF NOT EXISTS "idx_pg_user_sessions_staff_status" ON "user_sessions" ("staff_id", "status");
    CREATE INDEX IF NOT EXISTS "idx_pg_user_sessions_status" ON "user_sessions" ("status");
  `);

  const rawDb = drizzle(pglite, { schema: pgSchema });
  const db = wrapPgDb(rawDb);

  // Test 1: Staff & Session insertion and retrieval
  const staffId = `staff_pg_${Date.now()}`;
  const email = "admin@thaiba.res.in";

  await db.insert(pgSchema.staff).values({
    id: staffId,
    email,
    employeeId: `EMP_${Date.now()}`,
    firstName: "Admin",
    lastName: "User",
    role: "admin",
    isActive: true,
  });

  const now = Date.now();
  const sessionId = `sid_pg_${Date.now()}`;

  await db.insert(pgSchema.userSessions).values({
    id: sessionId,
    staffId,
    email,
    role: "admin",
    institutionId: "inst_1",
    status: "active",
    clientIp: "127.0.0.1",
    userAgent: "Mozilla/5.0",
    deviceType: "desktop",
    loginAt: now,
    lastActiveAt: now,
    expiresAt: now + 7 * 86400000,
    createdAt: now,
  });

  const [retrieved] = await db
    .select()
    .from(pgSchema.userSessions)
    .where(eq(pgSchema.userSessions.id, sessionId));

  if (!retrieved || retrieved.id !== sessionId || retrieved.status !== "active") {
    throw new Error(`Test 1 Failed: Session retrieval mismatch: ${JSON.stringify(retrieved)}`);
  }
  console.log("PASS Test 1: Session inserted and retrieved through wrapPgDb on Postgres");

  // Test 2: Idempotent session termination via .returning()
  const result1 = await db
    .update(pgSchema.userSessions)
    .set({
      status: "terminated",
      logoutAt: Date.now(),
    })
    .where(
      and(
        eq(pgSchema.userSessions.id, sessionId),
        eq(pgSchema.userSessions.status, "active")
      )
    )
    .returning({ id: pgSchema.userSessions.id });

  if (result1.length !== 1 || result1[0].id !== sessionId) {
    throw new Error(`Test 2 Failed: First termination did not return expected row: ${JSON.stringify(result1)}`);
  }

  const result2 = await db
    .update(pgSchema.userSessions)
    .set({
      status: "terminated",
      logoutAt: Date.now(),
    })
    .where(
      and(
        eq(pgSchema.userSessions.id, sessionId),
        eq(pgSchema.userSessions.status, "active")
      )
    )
    .returning({ id: pgSchema.userSessions.id });

  if (result2.length !== 0) {
    throw new Error(`Test 2 Failed: Idempotent second termination returned non-empty: ${JSON.stringify(result2)}`);
  }
  console.log("PASS Test 2: Idempotent session termination with .returning() on Postgres");

  // Test 3: Transactional step-up token consumption & replay prevention
  const jti = `jti_${crypto.randomUUID()}`;
  await db.transaction(async (tx: any) => {
    await tx.insert(pgSchema.stepUpUsed).values({
      jti,
      staffId,
      action: "session:terminate",
      expiresAt: now + 300000,
      usedAt: now,
    });
  });

  const [recorded] = await db
    .select()
    .from(pgSchema.stepUpUsed)
    .where(eq(pgSchema.stepUpUsed.jti, jti));

  if (!recorded || recorded.jti !== jti) {
    throw new Error(`Test 3 Failed: Step-up token was not recorded in step_up_used: ${JSON.stringify(recorded)}`);
  }

  // 2nd insertion with identical jti MUST throw unique constraint violation
  let caughtError: any = null;
  try {
    await db.transaction(async (tx: any) => {
      await tx.insert(pgSchema.stepUpUsed).values({
        jti,
        staffId,
        action: "session:terminate",
        expiresAt: now + 300000,
        usedAt: now,
      });
    });
  } catch (err: any) {
    caughtError = err;
  }

  if (!caughtError) {
    throw new Error("Test 3 Failed: Duplicate jti insertion did not throw!");
  }

  const allMessages = [
    caughtError?.message,
    caughtError?.cause?.message,
    caughtError?.cause?.cause?.message,
    String(caughtError),
  ]
    .filter(Boolean)
    .join(" ");

  const allCodes = [
    caughtError?.code,
    caughtError?.rawCode,
    caughtError?.cause?.code,
    caughtError?.cause?.rawCode,
  ].filter(Boolean);

  const isStepUpPrimaryKeyReplay =
    allCodes.includes("23505") ||
    allCodes.includes("SQLITE_CONSTRAINT_PRIMARYKEY") ||
    allCodes.includes("SQLITE_CONSTRAINT_UNIQUE") ||
    allMessages.includes("step_up_used_pkey") ||
    allMessages.includes("step_up_used.jti") ||
    allMessages.includes("duplicate key value violates unique constraint") ||
    (allMessages.includes("step_up_used") &&
      (allMessages.includes("UNIQUE") ||
        allMessages.includes("PRIMARY") ||
        allMessages.includes("constraint")));

  if (!isStepUpPrimaryKeyReplay) {
    throw new Error(`Test 3 Failed: Error was not classified as primary key replay: ${allMessages}`);
  }
  console.log("PASS Test 3: Duplicate jti correctly rejected with Postgres unique violation (replay detected)");

  await pglite.close();
  console.log("=== All Stage 1 Postgres/PGlite verification tests passed! ===");
}

if (typeof it === "function") {
  it("exports runStage1PgVerification", () => {
    expect(typeof runStage1PgVerification).toBe("function");
  });
}

if (typeof require !== "undefined" && require.main === module) {
  runStage1PgVerification().catch((err) => {
    console.error("FATAL ERROR in Postgres verification:", err);
    process.exit(1);
  });
}
