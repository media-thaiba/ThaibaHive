const { createClient } = require("@libsql/client");
const client = createClient({
  url: "file:./dev.db"
});

async function main() {
  try {
    const result = await client.execute("SELECT id, email, nfc_tag_id FROM staff WHERE id = '34c45253-9416-4512-9fb6-179e257e346b'");
    console.log("Staff NFC Tag:", result.rows);
  } catch (e) {
    console.error(e);
  }
}

main().then(() => process.exit(0));
