const { createClient } = require("@libsql/client");
const client = createClient({
  url: "file:./dev.db"
});

async function main() {
  try {
    const result = await client.execute("UPDATE staff SET nfc_tag_id = 'test-nfc-tag-123' WHERE id = '34c45253-9416-4512-9fb6-179e257e346b'");
    console.log("Updated NFC Tag ID in DB:", result.rowsAffected);
  } catch (e) {
    console.error(e);
  }
}

main().then(() => process.exit(0));
