import * as fs from "node:fs";
import * as path from "node:path";

const filePath = path.resolve("./spike/run-fullchain.ts");
let content = fs.readFileSync(filePath, "utf-8");

// 1. Add imports at the top
const importOld = `import { validateSpikeDatabaseUrl } from "./src/guard.js";`;
const importNew = `import { validateSpikeDatabaseUrl } from "./src/guard.js";
import { runTest2 } from "./tests/test2-libsql-probe.js";
import { runTest4 } from "./tests/test4-concurrency-stress.js";
import { runTest5 } from "./tests/test5-fine-calculation.js";
import { runTest6 } from "./tests/test6-negative-service.js";
import { runTest7 } from "./tests/test7-mutation-proof.js";`;

content = content.replace(importOld, importNew);

// 2. Add catalog audit to Stage 3 and log constraint names
const stage3Old = `    INSERT INTO students (id, institution_id, admission_no, first_name, last_name, gender)
    VALUES ('stu_audit_1', 'inst_audit_a', 'ADM-001', 'Alice', 'Smith', 'female')
    ON CONFLICT DO NOTHING;
  \`);

  // Test 4A: Duplicate insertion on students(institution_id, id)
  let stuDuplicateRejected = false;
  try {
    // Attempt inserting duplicate composite key with a different admission number
    await pgMaintClient.query(\`
      INSERT INTO students (id, institution_id, admission_no, first_name, last_name, gender)
      VALUES ('stu_audit_1', 'inst_audit_a', 'ADM-DUPE', 'Alice', 'Duplicate', 'female');
    \`);
  } catch (err: any) {
    if (err.code === "23505") { // unique_violation
      stuDuplicateRejected = true;
      log(\`  ✓ students duplicate (institution_id, id) successfully rejected by uq_student_inst_id [23505]\`);
    } else {
      throw err;
    }
  }
  if (!stuDuplicateRejected) throw new Error("Expected students duplicate to be rejected by uq_student_inst_id");

  // Test 4B: Duplicate insertion on staff_institutions(institution_id, staff_id)
  let staffDuplicateRejected = false;
  try {
    await pgMaintClient.query(\`
      INSERT INTO staff_institutions (id, institution_id, staff_id)
      VALUES ('si_audit_dupe', 'inst_audit_a', 'staff_audit_1');
    \`);
  } catch (err: any) {
    if (err.code === "23505") {
      staffDuplicateRejected = true;
      log(\`  ✓ staff_institutions duplicate (institution_id, staff_id) successfully rejected by uq_staff_inst [23505]\`);
    } else {
      throw err;
    }
  }
  if (!staffDuplicateRejected) throw new Error("Expected staff_institutions duplicate to be rejected by uq_staff_inst");

  // Test 4C: Duplicate insertion on academic_years(institution_id, id)
  let ayDuplicateRejected = false;
  try {
    await pgMaintClient.query(\`
      INSERT INTO academic_years (id, institution_id, name, start_date, end_date)
      VALUES ('ay_audit_2026', 'inst_audit_a', '2026-2027 DUPE', '2026-06-01', '2027-05-31');
    \`);
  } catch (err: any) {
    if (err.code === "23505") {
      ayDuplicateRejected = true;
      log(\`  ✓ academic_years duplicate (institution_id, id) successfully rejected by uq_ay_inst_id [23505]\`);
    } else {
      throw err;
    }
  }
  if (!ayDuplicateRejected) throw new Error("Expected academic_years duplicate to be rejected by uq_ay_inst_id");`;

const stage3New = `    INSERT INTO students (id, institution_id, admission_no, first_name, last_name, gender)
    VALUES ('stu_audit_1', 'inst_audit_a', 'ADM-001', 'Alice', 'Smith', 'female')
    ON CONFLICT DO NOTHING;
  \`);

  // Verify constraints in pg_constraint catalog
  const catalogConstraints = await pgMaintClient.query(\`
    SELECT conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conname IN ('uq_student_inst_id', 'uq_staff_inst', 'uq_ay_inst_id')
    ORDER BY conname;
  \`);
  log("\\n[CATALOG CONSTRAINT AUDIT] Composite Unique Constraints in pg_constraint:");
  for (const c of catalogConstraints.rows) {
    log(\`  - \${c.conname}: \${c.def}\`);
  }
  if (catalogConstraints.rows.length !== 3) {
    throw new Error(\`Expected 3 composite unique constraints in catalog, found \${catalogConstraints.rows.length}\`);
  }

  // Test 4A: Duplicate insertion on students(institution_id, id)
  let stuDuplicateRejected = false;
  try {
    await pgMaintClient.query(\`
      INSERT INTO students (id, institution_id, admission_no, first_name, last_name, gender)
      VALUES ('stu_audit_1', 'inst_audit_a', 'ADM-DUPE', 'Alice', 'Duplicate', 'female');
    \`);
  } catch (err: any) {
    if (err.code === "23505") { // unique_violation
      stuDuplicateRejected = true;
      log(\`  ✓ students duplicate rejected [23505] (constraint: \${err.constraint})\`);
    } else {
      throw err;
    }
  }
  if (!stuDuplicateRejected) throw new Error("Expected students duplicate to be rejected");

  // Test 4B: Duplicate insertion on staff_institutions(institution_id, staff_id)
  let staffDuplicateRejected = false;
  try {
    await pgMaintClient.query(\`
      INSERT INTO staff_institutions (id, institution_id, staff_id)
      VALUES ('si_audit_dupe', 'inst_audit_a', 'staff_audit_1');
    \`);
  } catch (err: any) {
    if (err.code === "23505") {
      staffDuplicateRejected = true;
      log(\`  ✓ staff_institutions duplicate rejected [23505] (constraint: \${err.constraint})\`);
      if (err.constraint !== "uq_staff_inst") {
        throw new Error(\`Expected constraint uq_staff_inst, got \${err.constraint}\`);
      }
    } else {
      throw err;
    }
  }
  if (!staffDuplicateRejected) throw new Error("Expected staff_institutions duplicate to be rejected by uq_staff_inst");

  // Test 4C: Duplicate insertion on academic_years(institution_id, id)
  let ayDuplicateRejected = false;
  try {
    await pgMaintClient.query(\`
      INSERT INTO academic_years (id, institution_id, name, start_date, end_date)
      VALUES ('ay_audit_2026', 'inst_audit_a', '2026-2027 DUPE', '2026-06-01', '2027-05-31');
    \`);
  } catch (err: any) {
    if (err.code === "23505") {
      ayDuplicateRejected = true;
      log(\`  ✓ academic_years duplicate rejected [23505] (constraint: \${err.constraint})\`);
    } else {
      throw err;
    }
  }
  if (!ayDuplicateRejected) throw new Error("Expected academic_years duplicate to be rejected");`;

content = content.replace(stage3Old, stage3New);

// 3. Rename Stage 6 and add Stage 7 (Suite Tests 2-6) and Stage 8 (Test 7 Harness Mutations)
const stage6HeaderOld = `  // =========================================================================
  // CONDITION 6: TEST 7 DELIBERATE MUTATION PROOF (MUST CATCH ALL 4)
  // =========================================================================
  log("\\n---------------------------------------------------------------");
  log("STAGE 6: Test 7 Deliberate Mutation Proof (All Tests Must Fail)");
  log("---------------------------------------------------------------");`;

const stage6HeaderNew = `  // =========================================================================
  // CONDITION 6: NEGATIVE-PATH SQL INJECTION & BOUNDARY ATTACKS
  // =========================================================================
  log("\\n---------------------------------------------------------------");
  log("STAGE 6: Negative-Path SQL Injection & Boundary Attacks");
  log("---------------------------------------------------------------");`;

content = content.replace(stage6HeaderOld, stage6HeaderNew);

// Add Stage 7 and Stage 8 after Stage 6 mutations
const stage6EndOld = `  const allMutationsCaught = mutationResults.every((m) => m.caught);
  if (!allMutationsCaught) {
    throw new Error("One or more deliberate mutations were NOT caught by constraints!");
  }
  log(\`All 4 deliberate mutations caught: \${allMutationsCaught}\`);

  // Clean up clients
  await pgAppClient.end();
  await pgMaintClient.end();`;

const stage6EndNew = `  const allMutationsCaught = mutationResults.every((m) => m.caught);
  if (!allMutationsCaught) {
    throw new Error("One or more deliberate mutations were NOT caught by constraints!");
  }
  log(\`All 4 negative SQL boundary mutations caught: \${allMutationsCaught}\`);

  // Clean up initial clients before running test suites
  await pgAppClient.end();
  await pgMaintClient.end();

  // =========================================================================
  // CONDITION 5: FULL-CHAIN RE-RUN OF SUITE TESTS 2–6
  // =========================================================================
  log("\\n---------------------------------------------------------------");
  log("STAGE 7: Executing Test Suites 2–6 Against Full Chain Databases");
  log("---------------------------------------------------------------");

  log("\\n[TEST 2] LibSQL Connection Pragma, FKs & Collision Probe on spike-chain.db:");
  const t2 = await runTest2(sqliteDbPath);
  log(\`  ✓ Test 2 Passed = \${t2.passed} (\${t2.sqliteTotalFkConstraints} FKs across \${t2.sqliteTotalFkColumnRows} column rows)\`);
  if (!t2.passed) throw new Error("Test 2 failed on full chain database!");

  log("\\n[TEST 4] Production Pool Concurrency & Service Stress on spike_chain_db:");
  const t4 = await runTest4(chainAppUrl);
  log(\`  ✓ Bed Collision Race: \${t4.bedIterationsPassed} / 50 passed\`);
  log(\`  ✓ Student Collision Race: \${t4.studentIterationsPassed} / 50 passed\`);
  log(\`  ✓ CAS Gate Pass Reissue Race: \${t4.casReissueIterationsPassed} / 10 passed\`);
  log(\`  ✓ Room Capacity Locked (FOR UPDATE): Passed = \${t4.capacityLockedPassed}\`);
  log(\`  ✓ Negative Control (Race Detected when Unlocked): Detected = \${t4.negativeControlDetectedRace}\`);
  if (t4.bedIterationsPassed !== 50 || t4.studentIterationsPassed !== 50 || t4.casReissueIterationsPassed !== 10) {
    throw new Error("Test 4 concurrency stress failed on full chain database!");
  }

  log("\\n[TEST 5] Table-Driven Late-Fine Calculation Unit Test:");
  const t5 = runTest5();
  log(\`  ✓ Test 5 Result: \${t5.passedCases} / \${t5.totalCases} cases passed (allPassed = \${t5.allPassed})\`);
  for (const r of t5.results) {
    log(\`    - [\${r.passed ? "PASS" : "FAIL"}] \${r.name}: \${r.details}\`);
  }
  if (!t5.allPassed) throw new Error("Test 5 fine calculation failed!");

  log("\\n[TEST 6] Negative-Path Service Tests on Both Dialects:");
  const t6 = await runTest6(chainAppUrl, sqliteDbPath);
  log(\`  ✓ Test 6 Result: \${t6.passedChecks} / \${t6.totalChecks} checks passed (allPassed = \${t6.allPassed})\`);
  for (const r of t6.results) {
    log(\`    - [\${r.passed ? "PASS" : "FAIL"}] [\${r.dialect}] \${r.name}: \${r.details}\`);
  }
  if (!t6.allPassed) throw new Error("Test 6 negative service tests failed on full chain database!");

  // =========================================================================
  // CONDITION 6: TEST 7 DELIBERATE HARNESS MUTATIONS (RED -> GREEN VERIFIED)
  // =========================================================================
  log("\\n---------------------------------------------------------------");
  log("STAGE 8: Test 7 Deliberate Harness Mutations (Red -> Green Proof)");
  log("---------------------------------------------------------------");
  const t7 = await runTest7(chainMaintUrl, chainAppUrl);
  log(\`Test 7 Result: All 4 deliberate harness mutations caught = \${t7.allMutationsCaught}\`);
  for (const r of t7.mutationResults) {
    log(\`  - [\${r.caught ? "CAUGHT" : "MISSED"}] \${r.mutation}\`);
    log(\`    \${r.details}\`);
  }
  if (!t7.allMutationsCaught) throw new Error("One or more deliberate harness mutations were NOT caught!");`;

content = content.replace(stage6EndOld, stage6EndNew);

fs.writeFileSync(filePath, content, "utf-8");
console.log("Successfully enhanced spike/run-fullchain.ts");
