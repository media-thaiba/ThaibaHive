import { snapshotReconstructor } from "../../src/lib/compliance/snapshot-reconstructor";

async function main() {
  const args = process.argv.slice(2);
  const baseUri = args.find((a) => a.startsWith("--base="))?.split("=")[1];
  const targetUri = args.find((a) => a.startsWith("--target="))?.split("=")[1];
  const inspectUri = args.find((a) => a.startsWith("--inspect="))?.split("=")[1];

  console.log("===============================================================");
  console.log(" 🔍 ThaibaHive Forensic Snapshot Reconstruction & Diff CLI");
  console.log("===============================================================");

  if (inspectUri) {
    console.log(` Inspecting Snapshot: ${inspectUri}`);
    const { manifest, verified, error } = await snapshotReconstructor.loadAndVerify(inspectUri);

    if (!manifest) {
      console.error(` ❌ Failed to load snapshot: ${error}`);
      process.exit(1);
    }

    console.log(` ✅ Digital Signature Status: ${verified ? "VALID (RSA-SHA256)" : "INVALID / FAILED"}`);
    console.log(` Snapshot ID      : ${manifest.id}`);
    console.log(` Tenant ID        : ${manifest.tenantId}`);
    console.log(` Timestamp        : ${manifest.timestamp}`);
    console.log(` Checksum SHA-256 : ${manifest.checksumSha256}`);
    console.log(` Entity Summary   : ${JSON.stringify(manifest.entityCounts)}`);
    console.log("===============================================================");
    process.exit(0);
  }

  if (baseUri && targetUri) {
    console.log(` Comparing Base: ${baseUri}`);
    console.log(` Against Target: ${targetUri}`);
    console.log("---------------------------------------------------------------");

    const baseRes = await snapshotReconstructor.loadAndVerify(baseUri);
    const targetRes = await snapshotReconstructor.loadAndVerify(targetUri);

    if (!baseRes.manifest || !targetRes.manifest) {
      console.error(" ❌ Failed to load one or both snapshots for diff comparison");
      process.exit(1);
    }

    const diff = snapshotReconstructor.diffSnapshots(baseRes.manifest, targetRes.manifest);

    console.log(` Summary: ${diff.summary}`);
    console.log(` Added Users        : ${diff.addedEntities.users.length}`);
    console.log(` Modified Users     : ${diff.modifiedEntities.users.length}`);
    console.log(` Deleted Users      : ${diff.deletedEntities.users.length}`);
    console.log(` Added Institutions : ${diff.addedEntities.institutions.length}`);
    console.log("===============================================================");
    process.exit(0);
  }

  console.log(" Usage: ");
  console.log("   tsx scripts/compliance/snapshot-reconstruct.ts --inspect=file://...");
  console.log("   tsx scripts/compliance/snapshot-reconstruct.ts --base=file://... --target=file://...");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error during snapshot reconstruction:", err);
  process.exit(1);
});
