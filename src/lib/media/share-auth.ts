import { getJwtSecretBytes } from "@thaiba/auth";
import { createHmac, timingSafeEqual } from "crypto";

export function signShareAuthCookie(token: string, passwordHash: string): string {
  return createHmac("sha256", getJwtSecretBytes("session"))
    .update(`share_auth:${token}:${passwordHash}`)
    .digest("hex");
}

export function verifyShareAuthCookie(
  cookieVal: string | undefined,
  token: string,
  passwordHash: string
): boolean {
  if (!cookieVal) return false;
  const expected = signShareAuthCookie(token, passwordHash);
  const a = Buffer.from(cookieVal);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
