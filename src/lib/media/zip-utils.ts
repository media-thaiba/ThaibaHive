/**
 * Sanitize asset and folder names against Zip Slip path traversal vulnerabilities
 */
export function sanitizeZipEntryName(rawName: string): string {
  const clean = rawName.replace(/[\0\r\n\t]/g, "").trim();
  const safe = clean
    .replace(/(\.\.[\/\\])+/g, "")
    .replace(/[\/\\]+/g, "_")
    .replace(/^\.+/, "");
  return safe || "unnamed_asset";
}

export function sanitizeZipFolderName(rawName: string): string {
  const clean = rawName.replace(/[\0\r\n\t]/g, "").trim();
  const safe = clean
    .replace(/(\.\.[\/\\])+/g, "")
    .replace(/[\/\\]+/g, "_")
    .replace(/^\.+/, "");
  return safe || "unnamed_folder";
}
