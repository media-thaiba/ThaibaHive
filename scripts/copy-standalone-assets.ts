import * as fs from "fs";
import * as path from "path";

export function copyStandaloneAssets() {
  const root = process.cwd();
  const staticSrc = path.join(root, ".next", "static");
  const staticDest = path.join(root, ".next", "standalone", ".next", "static");
  const publicSrc = path.join(root, "public");
  const publicDest = path.join(root, ".next", "standalone", "public");

  if (fs.existsSync(staticSrc)) {
    fs.mkdirSync(path.dirname(staticDest), { recursive: true });
    fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });
    console.log("[standalone] Copied .next/static -> .next/standalone/.next/static");
  }

  if (fs.existsSync(publicSrc)) {
    fs.mkdirSync(publicDest, { recursive: true });
    fs.cpSync(publicSrc, publicDest, { recursive: true, force: true });
    console.log("[standalone] Copied public -> .next/standalone/public");
  }
}

if (require.main === module || !process.env.PLAYWRIGHT_TEST) {
  copyStandaloneAssets();
}
