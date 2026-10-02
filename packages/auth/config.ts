function getJwtSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_JWT_SECRET must be set in production");
  }
  return "default_jwt_secret_for_thaibahive_auth";
}

export const authConfig = {
  jwtSecret: getJwtSecret(),
  sessionExpiry: "7d",
  cookieName: "thaibahive_session",
  passwordRounds: 10,
};
