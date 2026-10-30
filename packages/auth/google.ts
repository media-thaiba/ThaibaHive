import { createRemoteJWKSet, jwtVerify } from "jose";

let _googleJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getGoogleJwks() {
  if (!_googleJwks) {
    _googleJwks = createRemoteJWKSet(
      new URL("https://www.googleapis.com/oauth2/v3/certs")
    );
  }
  return _googleJwks;
}

export async function verifyGoogleToken(
  idToken: string,
  allowedClientIds?: string[]
): Promise<{
  email: string;
  name?: string;
  picture?: string;
  sub: string;
  jti?: string;
}> {
  if (!idToken) {
    throw new Error("Google ID token is required");
  }

  if (!allowedClientIds || allowedClientIds.length === 0) {
    throw new Error(
      "Google authentication misconfigured: allowedClientIds must be provided and non-empty"
    );
  }

  const { payload } = await jwtVerify(idToken, getGoogleJwks(), {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: allowedClientIds,
  });

  if (payload.email_verified !== true && payload.email_verified !== "true") {
    throw new Error("Google email is not verified");
  }

  return {
    email: String(payload.email || ""),
    name: payload.name ? String(payload.name) : undefined,
    picture: payload.picture ? String(payload.picture) : undefined,
    sub: String(payload.sub),
    jti: payload.jti ? String(payload.jti) : undefined,
  };
}
