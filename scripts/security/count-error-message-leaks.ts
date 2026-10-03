import fs from "fs";
import path from "path";

function scanDirectory(dir: string, results: Record<string, number> = {}): Record<string, number> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath, results);
    } else if (entry.isFile() && (entry.name === "route.ts" || entry.name.endsWith(".ts"))) {
      const content = fs.readFileSync(fullPath, "utf-8");
      const matches = content.match(/(?:error|message):\s*(?:error|err)\.message/g);
      if (matches && matches.length > 0) {
        // Group by top-level API directory (e.g. src/app/api/auth)
        const rel = path.relative("src/app/api", fullPath).replace(/\\/g, "/");
        const topDir = rel.split("/")[0] || "root";
        results[topDir] = (results[topDir] || 0) + matches.length;
      }
    }
  }

  return results;
}

const apiDir = path.resolve("src/app/api");
const counts = scanDirectory(apiDir);
console.log("=== API Route `(err|error).message` Leak Counts by Directory ===");
let total = 0;
for (const [dir, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${dir.padEnd(20)}: ${count}`);
  total += count;
}
console.log(`-----------------------------------------------`);
console.log(`Total remaining raw message returns: ${total}`);
