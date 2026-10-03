const { SignJWT } = require("jose");

const secret = new TextEncoder().encode(
  process.env.AUTH_JWT_SECRET || "test-loadtest-jwt-secret-key-32-chars-long"
);

async function generate() {
  const payload = {
    staffId: "34c45253-9416-4512-9fb6-179e257e346b",
    email: "admin@thaibahive.local",
    role: "super_admin",
    employeeId: "EMP001",
    name: "Test Admin",
    institutionId: "inst_campus_main",
    tokenVersion: 0,
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .setIssuedAt()
    .sign(secret);

  process.stdout.write(token);
}

generate().catch((err) => {
  console.error("Token generation failed:", err);
  process.exit(1);
});

