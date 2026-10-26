import { verifyGoogleToken } from "../../packages/auth/google";
import { generateKeyPair, SignJWT, type JWTVerifyGetKey } from "jose";

const verifyGoogle: any = verifyGoogleToken;

async function run() {
  console.log("=== Real Cryptographic Token Verification (No Mocks) ===");

  const allowedClientIds = [
    "client-web-12345.apps.googleusercontent.com",
    "client-mobile-67890.apps.googleusercontent.com",
  ];

  // 1. Generate real RSA keypairs
  const keyPairA = await generateKeyPair("RS256");
  const keyPairB = await generateKeyPair("RS256");

  // Local key resolver returning Key A's public key (simulates Google's JWKS key set)
  const localKeyResolverA: JWTVerifyGetKey = async () => keyPairA.publicKey;

  // Test 1: Real RSA signature + genuine claims -> MUST PASS
  console.log("\n[Test 1] Testing Genuine RSA-signed token...");
  const validToken = await new SignJWT({
    email: "media@thaibagarden.com",
    name: "Media Admin",
    picture: "https://photos.google.com/p1",
    email_verified: true,
  })
    .setProtectedHeader({ alg: "RS256", kid: "key-a" })
    .setIssuer("https://accounts.google.com")
    .setAudience(allowedClientIds[0])
    .setSubject("google-sub-real-crypto-001")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(keyPairA.privateKey);

  const res1 = await verifyGoogle(validToken, allowedClientIds, localKeyResolverA);
  console.log("  Extracted Identity:", res1);
  const pass1 = res1.email === "media@thaibagarden.com" && res1.sub === "google-sub-real-crypto-001";

  // Test 2: Forged token signed with untrusted Key B -> MUST FAIL SIGNATURE CHECK
  console.log("\n[Test 2] Testing Forged token signed with untrusted Key B...");
  const forgedToken = await new SignJWT({
    email: "attacker@gmail.com",
    email_verified: true,
  })
    .setProtectedHeader({ alg: "RS256", kid: "key-b" })
    .setIssuer("https://accounts.google.com")
    .setAudience(allowedClientIds[0])
    .setSubject("attacker-sub")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(keyPairB.privateKey);

  let pass2 = false;
  try {
    await verifyGoogle(forgedToken, allowedClientIds, localKeyResolverA);
  } catch (err: any) {
    console.log("  Correctly rejected untrusted key:", err.message);
    pass2 = err.message.includes("signature verification failed");
  }

  // Test 3: Token issued to a different client ID (app audience mismatch) -> MUST FAIL AUD
  console.log("\n[Test 3] Testing Replay token issued to third-party app (wrong aud)...");
  const wrongAudToken = await new SignJWT({
    email: "staff@thaibahive.com",
    email_verified: true,
  })
    .setProtectedHeader({ alg: "RS256", kid: "key-a" })
    .setIssuer("https://accounts.google.com")
    .setAudience("third-party-unauthorized-app.apps.googleusercontent.com")
    .setSubject("staff-sub-123")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(keyPairA.privateKey);

  let pass3 = false;
  try {
    await verifyGoogle(wrongAudToken, allowedClientIds, localKeyResolverA);
  } catch (err: any) {
    console.log("  Correctly rejected audience mismatch:", err.message);
    pass3 = err.message.includes('unexpected "aud" claim value');
  }

  // Test 4: Token from untrusted issuer (wrong iss) -> MUST FAIL ISS
  console.log("\n[Test 4] Testing Token with untrusted issuer...");
  const wrongIssToken = await new SignJWT({
    email: "staff@thaibahive.com",
    email_verified: true,
  })
    .setProtectedHeader({ alg: "RS256", kid: "key-a" })
    .setIssuer("https://fake-google-login.attacker.com")
    .setAudience(allowedClientIds[0])
    .setSubject("staff-sub-123")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(keyPairA.privateKey);

  let pass4 = false;
  try {
    await verifyGoogle(wrongIssToken, allowedClientIds, localKeyResolverA);
  } catch (err: any) {
    console.log("  Correctly rejected issuer mismatch:", err.message);
    pass4 = err.message.includes('unexpected "iss" claim value');
  }

  // Test 5: Expired token -> MUST FAIL EXP
  console.log("\n[Test 5] Testing Expired token...");
  const expiredToken = await new SignJWT({
    email: "staff@thaibahive.com",
    email_verified: true,
  })
    .setProtectedHeader({ alg: "RS256", kid: "key-a" })
    .setIssuer("https://accounts.google.com")
    .setAudience(allowedClientIds[0])
    .setSubject("staff-sub-123")
    .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
    .sign(keyPairA.privateKey);

  let pass5 = false;
  try {
    await verifyGoogle(expiredToken, allowedClientIds, localKeyResolverA);
  } catch (err: any) {
    console.log("  Correctly rejected expired token:", err.message);
    pass5 = err.message.includes('"exp" claim timestamp check failed');
  }

  // Test 6: Missing / Empty sub -> MUST FAIL
  console.log("\n[Test 6] Testing Token with missing sub claim...");
  const missingSubToken = await new SignJWT({
    email: "staff@thaibahive.com",
    email_verified: true,
  })
    .setProtectedHeader({ alg: "RS256", kid: "key-a" })
    .setIssuer("https://accounts.google.com")
    .setAudience(allowedClientIds[0])
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(keyPairA.privateKey);

  let pass6 = false;
  try {
    await verifyGoogle(missingSubToken, allowedClientIds, localKeyResolverA);
  } catch (err: any) {
    console.log("  Correctly rejected missing sub:", err.message);
    pass6 = err.message.includes("Google ID token missing or invalid sub claim");
  }

  // Test 7: email_verified: false -> MUST FAIL
  console.log("\n[Test 7] Testing Token with email_verified: false...");
  const unverifiedEmailToken = await new SignJWT({
    email: "unverified@gmail.com",
    email_verified: false,
  })
    .setProtectedHeader({ alg: "RS256", kid: "key-a" })
    .setIssuer("https://accounts.google.com")
    .setAudience(allowedClientIds[0])
    .setSubject("sub-unverified")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(keyPairA.privateKey);

  let pass7 = false;
  try {
    await verifyGoogle(unverifiedEmailToken, allowedClientIds, localKeyResolverA);
  } catch (err: any) {
    console.log("  Correctly rejected unverified email:", err.message);
    pass7 = err.message.includes("Google email is not verified");
  }

  console.log("\n---------------------------------------------------------");
  console.log("REAL CRYPTOGRAPHIC VERIFICATION RESULTS:");
  console.log("  1. Genuine RSA Signature & Claims:       ", pass1 ? "✅ PASS" : "❌ FAIL");
  console.log("  2. Untrusted RSA Key Blocked:            ", pass2 ? "✅ PASS" : "❌ FAIL");
  console.log("  3. Audience Mismatch Blocked:            ", pass3 ? "✅ PASS" : "❌ FAIL");
  console.log("  4. Issuer Mismatch Blocked:              ", pass4 ? "✅ PASS" : "❌ FAIL");
  console.log("  5. Expired Token Blocked:                ", pass5 ? "✅ PASS" : "❌ FAIL");
  console.log("  6. Missing / Empty Sub Blocked:          ", pass6 ? "✅ PASS" : "❌ FAIL");
  console.log("  7. Unverified Email Blocked:             ", pass7 ? "✅ PASS" : "❌ FAIL");
  console.log("---------------------------------------------------------");

  if (pass1 && pass2 && pass3 && pass4 && pass5 && pass6 && pass7) {
    console.log("\n✅ ALL 7 REAL CRYPTOGRAPHIC SIGNATURE & CLAIM TESTS PASSED!");
  } else {
    throw new Error("Real crypto test failed");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
