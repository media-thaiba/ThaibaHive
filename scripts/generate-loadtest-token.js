const crypto = require("crypto");
const { SignJWT } = require("jose");
const { createClient } = require("@libsql/client");

const HKDF_SALT = "thaibahive:jwt:salt:v1";

function derivePurposeSecret(masterSecret, purpose = "session") {
  if (typeof crypto.hkdfSync === "function") {
    const derived = crypto.hkdfSync(
      "sha256",
      Buffer.from(masterSecret, "utf-8"),
      Buffer.from(HKDF_SALT, "utf-8"),
      Buffer.from(`thaibahive:purpose:${purpose}:v1`, "utf-8"),
      32
    );
    return Buffer.from(derived).toString("hex");
  }
  const hmac = crypto.createHmac("sha256", masterSecret);
  hmac.update(`thaibahive:purpose:${purpose}:v1`);
  return hmac.digest("hex");
}

function getJwtSecretBytes(purpose = "session") {
  const masterSecret = process.env.AUTH_JWT_SECRET || "dev-jwt-secret-min-32-chars-long-security-key-thaibahive";
  return new TextEncoder().encode(derivePurposeSecret(masterSecret, purpose));
}

async function generate() {
  const sid = "sess_" + crypto.randomBytes(16).toString("hex");
  const nowMs = Date.now();
  const expiresAtMs = nowMs + 24 * 60 * 60 * 1000;

  const payload = {
    sid,
    staffId: "34c45253-9416-4512-9fb6-179e257e346b",
    email: "admin@thaibahive.local",
    role: "super_admin",
    employeeId: "EMP001",
    name: "Test Admin",
    institutionId: "inst_campus_main",
    tokenVersion: 0,
  };

  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
  try {
    const client = createClient({ url: dbUrl });
    await client.execute({
      sql: `INSERT OR REPLACE INTO user_sessions (id, staff_id, email, role, institution_id, status, client_ip, user_agent, device_type, login_at, last_active_at, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, 'active', '127.0.0.1', 'k6-load-test', 'desktop', ?, ?, ?, ?)`,
      args: [
        sid,
        payload.staffId,
        payload.email,
        payload.role,
        payload.institutionId,
        nowMs,
        nowMs,
        expiresAtMs,
        nowMs,
      ],
    });
  } catch (err) {
    // Non-fatal if DB write fails during token generation in isolated contexts
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .setIssuedAt()
    .sign(getJwtSecretBytes("session"));

  process.stdout.write(token);
}

generate().catch((err) => {
  console.error("Token generation failed:", err);
  process.exit(1);
});
