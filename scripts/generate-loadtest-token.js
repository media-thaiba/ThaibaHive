const { SignJWT } = require("jose");

const secret = new TextEncoder().encode(process.env.AUTH_JWT_SECRET || "thaiba_jwt_secret_key_production_certified_2026");

async function generate() {
  const payload = {
    staffId: "34c45253-9416-4512-9fb6-179e257e346b",
    email: "admin@thaibahive.local",
    role: "super_admin",
    employeeId: "EMP001",
    name: "Test Admin",
    tokenVersion: 0,
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(secret);

  console.log(token);
}

generate().catch(console.error);
