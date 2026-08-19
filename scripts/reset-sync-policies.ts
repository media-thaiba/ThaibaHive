import { createClient } from "@libsql/client";

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

const client = createClient({
  url: databaseUrl,
});

async function main() {
  console.log("=== Sync Policies Database Reset Script ===");
  try {
    console.log("Cleaning sync_tuning_policies table...");
    await client.execute("DELETE FROM sync_tuning_policies");

    console.log("Seeding baseline default policies...");
    const now = new Date().toISOString();
    await client.execute({
      sql: "INSERT INTO sync_tuning_policies (id, network_type, min_bandwidth_kbps, max_latency_ms, batch_size, compression_level, retry_backoff_ms, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["pol_wifi", "WIFI", 1000, 200, 100, 1, 3000, now]
    });
    await client.execute({
      sql: "INSERT INTO sync_tuning_policies (id, network_type, min_bandwidth_kbps, max_latency_ms, batch_size, compression_level, retry_backoff_ms, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["pol_cellular", "CELLULAR", 150, 800, 25, 5, 10000, now]
    });
    await client.execute({
      sql: "INSERT INTO sync_tuning_policies (id, network_type, min_bandwidth_kbps, max_latency_ms, batch_size, compression_level, retry_backoff_ms, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["pol_default", "DEFAULT", 0, 1500, 10, 9, 20000, now]
    });

    console.log("Sync policies re-seeded successfully!");
  } catch (err) {
    console.error("Failed to reset sync policies:", err);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
