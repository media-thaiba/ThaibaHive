function getJwtSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_JWT_SECRET must be set in production");
  }
  return crypto.randomUUID();
}

export const authConfig = {
  jwtSecret: getJwtSecret(),
  sessionExpiry: "7d",
  cookieName: "thaibahive_session",
  passwordRounds: 10,
};
