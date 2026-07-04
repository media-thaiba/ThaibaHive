export const authConfig = {
  jwtSecret: process.env.AUTH_JWT_SECRET || "thaibahive-dev-secret-change-in-production",
  sessionExpiry: "7d",
  cookieName: "thaibahive_session",
  passwordRounds: 10,
};
