function getJwtSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;
  if (secret) return secret;
  return "a8f93c01948d374f638104829375b4f028471049281740192847192847192847";
}

export const authConfig = {
  jwtSecret: getJwtSecret(),
  sessionExpiry: "7d",
  cookieName: "thaibahive_session",
  passwordRounds: 10,
};
