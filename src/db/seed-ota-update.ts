import { db } from "./index";
import { systemConfigs } from "./schema";

async function main() {
  const updates = [
    { key: "app_latest_version", value: "1.0.0+9" },
    { key: "app_download_url", value: "/downloads/ThaibaHive-v1.0.0+9.apk" },
    { key: "app_release_notes", value: "Added NFC Management, Location QR Checkpoints, Asset Barcode/NFC Tagging, Biometric Enrollment, BLE Beacon Pairing, and Visitor Gate Pass Verification." },
    { key: "app_force_update", value: "false" },
  ];

  for (const item of updates) {
    await db
      .insert(systemConfigs)
      .values(item)
      .onConflictDoUpdate({
        target: systemConfigs.key,
        set: { value: item.value },
      })
      .run();
  }

  console.log("Successfully updated system_configs for mobile OTA update 1.0.0+9!");
}

main().catch((err) => {
  console.error("Failed to seed system_configs:", err);
  process.exit(1);
});
