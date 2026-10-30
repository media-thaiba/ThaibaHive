import { POST } from "../../src/app/api/auth/google/route";
import { db, staff } from "../../src/db";
import { sql } from "drizzle-orm";

async function testUnlistedLogin() {
  console.log("===============================================================");
  console.log("   TEST: UNLISTED GOOGLE ACCOUNT LOGIN & ROW COUNT INVARIANCE  ");
  console.log("===============================================================\n");

  // 1. Initial staff count
  const initialStaff = await db.select({ count: sql<number>`count(*)` }).from(staff).get();
  const initialCount = initialStaff?.count ?? 0;
  console.log("Initial staff row count in DB:", initialCount);

  // 2. Intercept Google tokeninfo fetch with valid Google payload for unlisted email
  const originalFetch = globalThis.fetch;
  const clientId = "test-client-id.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_IDS = clientId;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = String(input);
    if (urlStr.includes("googleapis.com/tokeninfo")) {
      return new Response(
        JSON.stringify({
          email: "stranger.danger@gmail.com",
          email_verified: "true",
          name: "Stranger Danger",
          sub: "google_sub_stranger_99999",
          aud: clientId,
          exp: String(Math.floor(Date.now() / 1000) + 3600),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return originalFetch(input, init);
  };

  try {
    console.log("Sending POST /api/auth/google with valid unlisted Google token...");
    const req = new Request("https://thaiba-hive.vercel.app/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "valid_signed_google_jwt_for_stranger" }),
    });

    const response = await POST(req);
    const status = response.status;
    const data = await response.json();

    console.log("Response status:     ", status);
    console.log("Response JSON:       ", JSON.stringify(data));

    // 3. Final staff count
    const finalStaff = await db.select({ count: sql<number>`count(*)` }).from(staff).get();
    const finalCount = finalStaff?.count ?? 0;
    console.log("Final staff row count in DB:  ", finalCount);

    // Assertions
    const passedStatus = status === 403;
    const passedCode = data.code === "ACCOUNT_NOT_FOUND";
    const passedCount = initialCount === finalCount;
    const noSession = data.token === undefined;

    console.log("\n---------------------------------------------------------------");
    console.log("VERIFICATION CRITERIA:");
    console.log("  1. Returns HTTP 403:                  ", passedStatus ? "✅ PASS" : "❌ FAIL");
    console.log("  2. Error code is ACCOUNT_NOT_FOUND:   ", passedCode ? "✅ PASS" : "❌ FAIL");
    console.log("  3. Staff row count strictly unchanged:", passedCount ? "✅ PASS" : "❌ FAIL", `(${initialCount} -> ${finalCount})`);
    console.log("  4. No token or session issued:        ", noSession ? "✅ PASS" : "❌ FAIL");
    console.log("---------------------------------------------------------------\n");

    if (!passedStatus || !passedCode || !passedCount || !noSession) {
      process.exit(1);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
}

testUnlistedLogin().catch(console.error);
