export async function verifyGoogleToken(
  idToken: string,
  allowedClientIds?: string[]
): Promise<{
  email: string;
  name?: string;
  picture?: string;
  sub: string;
}> {
  if (!idToken) {
    throw new Error("Google ID token is required");
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google token validation failed: ${response.statusText} (${errText})`);
  }

  const payload = (await response.json()) as any;


  if (payload.error_description) {
    throw new Error(`Google token error: ${payload.error_description}`);
  }

  const exp = Number(payload.exp);
  if (isNaN(exp) || Date.now() >= exp * 1000) {
    throw new Error("Google ID token has expired");
  }

  if (payload.email_verified !== "true" && payload.email_verified !== true) {
    throw new Error("Google email is not verified");
  }

  if (allowedClientIds && allowedClientIds.length > 0) {
    const aud = payload.aud;
    if (!allowedClientIds.includes(aud)) {
      throw new Error(`Google token audience mismatch: ${aud} is not in allowed client IDs`);
    }
  }

  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    sub: payload.sub,
  };
}
