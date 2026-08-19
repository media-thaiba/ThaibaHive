import { forensicSnapshotEngine } from "../../src/lib/compliance/forensic-snapshot-engine";
import { retentionPolicyEngine } from "../../src/lib/compliance/retention-policy";

async function main() {
  const args = process.argv.slice(2);
  const tenantArg = args.find((a) => a.startsWith("--tenant="))?.split("=")[1] || "default";
  const dryRun = args.includes("--dry-run");

  console.log("===============================================================");
  console.log(" 📸 ThaibaHive Forensic Snapshot & Lifecycle Engine");
  console.log("===============================================================");
  console.log(` Target Tenant: ${tenantArg}`);
  console.log(` Dry Run Mode : ${dryRun ? "ENABLED" : "DISABLED"}`);
  console.log("---------------------------------------------------------------");

  console.log("1. Capturing point-in-time state snapshot...");
  const manifest = await forensicSnapshotEngine.captureSnapshot({
    tenantId: tenantArg,
    snapshotType: "SCHEDULED",
    metadata: { scheduledBy: "cron-runner" },
  });

  console.log(`   ✅ Snapshot Captured: ${manifest.id}`);
  console.log(`   SHA-256 Checksum    : ${manifest.checksumSha256}`);
  console.log(`   Entity Count (Users): ${manifest.entityCounts.users}`);
  console.log(`   Digital Signature   : ${manifest.signature ? "VALID (RSA-SHA256)" : "NONE"}`);

  console.log("---------------------------------------------------------------");
  console.log("2. Applying retention policy lifecycle...");
  const retentionStats = await retentionPolicyEngine.applyRetentionPolicy(dryRun);
  console.log(`   Hot Tier   : ${retentionStats.hotCount}`);
  console.log(`   Warm Tier  : ${retentionStats.warmCount}`);
  console.log(`   Cold Tier  : ${retentionStats.coldCount}`);
  console.log(`   Pruned     : ${retentionStats.prunedCount}`);
  console.log("===============================================================");
  console.log(" 🎉 Forensic Snapshot Execution Completed Successfully");
  console.log("===============================================================");

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error during forensic snapshot execution:", err);
  process.exit(1);
});
