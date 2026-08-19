const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdGFmZklkIjoiMzRjNDUyNTMtOTQxNi00NTEyLTlmYjYtMTc5ZTI1N2UzNDZiIiwiZW1haWwiOiJhZG1pbkB0aGFpYmFoaXZlLmxvY2FsIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZW1wbG95ZWVJZCI6IkVNUDAwMSIsIm5hbWUiOiJUZXN0IEFkbWluIiwidG9rZW5WZXJzaW9uIjowLCJleHAiOjE3ODc2NDYxNDcsImlhdCI6MTc4NzA0MTM0N30.DufQEiRtbpjNxAzMiEFrMmtqhHmaByeVSShwqTicYm8";

async function main() {
  try {
    const health = await fetch("http://localhost:3000/api/system/health");
    console.log("Health status:", health.status, await health.text());
  } catch (e) {
    console.error("Health check failed:", e.message);
  }

  try {
    const res = await fetch("http://localhost:3000/api/accounts", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Cookie": `thaibahive_session=${token}`
      }
    });
    console.log("Accounts status:", res.status, await res.text());
  } catch (e) {
    console.error("Accounts request failed:", e.message);
  }
}

main();
