const { performance } = require("perf_hooks");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const AUTH_TOKEN = process.env.AUTH_TOKEN || "eyJhbGciOiJIUzI1NiJ9.eyJzdGFmZklkIjoiMzRjNDUyNTMtOTQxNi00NTEyLTlmYjYtMTc5ZTI1N2UzNDZiIiwiZW1haWwiOiJhZG1pbkB0aGFpYmFoaXZlLmxvY2FsIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZW1wbG95ZWVJZCI6IkVNUDAwMSIsIm5hbWUiOiJUZXN0IEFkbWluIiwidG9rZW5WZXJzaW9uIjowLCJleHAiOjE3ODc2NDYxNDcsImlhdCI6MTc4NzA0MTM0N30.DufQEiRtbpjNxAzMiEFrMmtqhHmaByeVSShwqTicYm8";

async function runBenchmark(name, urlPath, method = "GET", body = null, concurrency = 50, durationSec = 10) {
  console.log(`\n==================================================`);
  console.log(`Starting Benchmark: ${name}`);
  console.log(`Target URL: ${BASE_URL}${urlPath}`);
  console.log(`Concurrency: ${concurrency} VUs | Duration: ${durationSec}s`);
  console.log(`==================================================`);

  const results = [];
  const startTime = performance.now();
  const endTime = startTime + durationSec * 1000;

  async function worker() {
    while (performance.now() < endTime) {
      const reqStart = performance.now();
      let success = false;
      let status = 0;
      
      try {
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AUTH_TOKEN}`,
          "Cookie": `thaibahive_session=${AUTH_TOKEN}`
        };

        const options = {
          method,
          headers,
        };

        if (body && (method === "POST" || method === "PATCH")) {
          options.body = typeof body === "function" ? JSON.stringify(body()) : JSON.stringify(body);
        }

        const res = await fetch(`${BASE_URL}${urlPath}`, options);
        status = res.status;
        if (res.status === 200 || res.status === 201) {
          success = true;
        } else if (res.status === 400 && urlPath.includes("check-in")) {
          const text = await res.text();
          success = text.includes("Already checked in today.");
        } else {
          success = false;
        }
      } catch (err) {
        status = 0;
        success = false;
      }
      
      const reqEnd = performance.now();
      results.push({
        duration: reqEnd - reqStart,
        success,
        status
      });

      // brief sleep
      await new Promise(r => setTimeout(r, 10));
    }
  }

  // Launch workers
  const workers = Array.from({ length: concurrency }).map(() => worker());
  await Promise.all(workers);

  const totalTimeSec = (performance.now() - startTime) / 1000;
  const totalRequests = results.length;
  
  if (totalRequests === 0) {
    console.log("No requests completed.");
    return;
  }

  const successfulRequests = results.filter(r => r.success).length;
  const failedRequests = totalRequests - successfulRequests;
  const errorRate = (failedRequests / totalRequests) * 100;

  // Sort durations for percentile calculation
  const durations = results.map(r => r.duration).sort((a, b) => a - b);
  const min = durations[0];
  const max = durations[durations.length - 1];
  const sum = durations.reduce((a, b) => a + b, 0);
  const avg = sum / durations.length;
  
  const p95Idx = Math.floor(durations.length * 0.95);
  const p99Idx = Math.floor(durations.length * 0.99);
  const p95 = durations[p95Idx];
  const p99 = durations[p99Idx];

  const throughput = totalRequests / totalTimeSec;

  console.log(`Results:`);
  console.log(`  Total Requests:      ${totalRequests}`);
  console.log(`  Successful (200):    ${successfulRequests}`);
  console.log(`  Failed/Errors:       ${failedRequests}`);
  console.log(`  Error Rate:          ${errorRate.toFixed(2)}%`);
  console.log(`  Throughput:          ${throughput.toFixed(2)} req/sec`);
  console.log(`  Latencies:`);
  console.log(`    Min:               ${min.toFixed(2)}ms`);
  console.log(`    Max:               ${max.toFixed(2)}ms`);
  console.log(`    Average:           ${avg.toFixed(2)}ms`);
  console.log(`    p95:               ${p95.toFixed(2)}ms`);
  console.log(`    p99:               ${p99.toFixed(2)}ms`);
  
  return {
    name,
    totalRequests,
    successfulRequests,
    errorRate,
    throughput,
    avg,
    p95,
    p99
  };
}

async function main() {
  const summary = [];

  // LT-001: Attendance Check-In
  const attendanceRes = await runBenchmark(
    "LT-001: Attendance Check-In POST",
    "/api/attendance/check-in",
    "POST",
    () => ({
      method: "nfc",
      nfcTagId: "test-nfc-tag-id-99"
    }),
    50, // concurrency
    5  // duration
  );
  if (attendanceRes) summary.push(attendanceRes);

  // LT-002: Exam Tabulation
  const tabulationRes = await runBenchmark(
    "LT-002: Exam Tabulation GET",
    "/api/examinations/tabulation?examId=exam_100",
    "GET",
    null,
    50,
    5
  );
  if (tabulationRes) summary.push(tabulationRes);

  // LT-003: Finance Ledger
  const ledgerRes = await runBenchmark(
    "LT-003: Finance Ledger GET",
    "/api/accounts",
    "GET",
    null,
    50,
    5
  );
  if (ledgerRes) summary.push(ledgerRes);

  // LT-004: BI Analytics
  const institutionId = process.env.INSTITUTION_ID || "inst_campus_main";
  const analyticsRes = await runBenchmark(
    "LT-004: BI Analytics GET",
    `/api/analytics?type=usage&institutionId=${institutionId}`,
    "GET",
    null,
    50,
    5
  );
  if (analyticsRes) summary.push(analyticsRes);

  console.log("\n==================================================");
  console.log("LOAD TEST EXECUTION SUMMARY");
  console.log("==================================================");
  console.table(summary);

  // Gate on thresholds
  let failed = false;
  for (const s of summary) {
    if (s.p95 >= 500) {
      console.error(`[THRESHOLD BREACH] ${s.name} p95 latency (${s.p95.toFixed(2)}ms) exceeded 500ms`);
      failed = true;
    }
    if (s.errorRate >= 5.0) {
      console.error(`[THRESHOLD BREACH] ${s.name} error rate (${s.errorRate.toFixed(2)}%) exceeded 5%`);
      failed = true;
    }
  }

  if (failed) {
    console.error("\n[FAILURE] Load test performance thresholds were breached.");
    process.exit(1);
  }

  console.log("\n[SUCCESS] All load test performance thresholds passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
