/**
 * Resolve a media fileUrl for rendering in the browser.
 * - `nas://…` → authenticated NAS serving route (D9* — was a dead link).
 * - everything else (API-relative paths) passes through unchanged.
 */
export function mediaObjectUrl(fileUrl: string | null | undefined): string {
  if (!fileUrl) return "";
  if (fileUrl.startsWith("nas://")) {
    const raw = fileUrl.slice("nas://".length).replace(/\\/g, "/");
    const encoded = raw
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");
    return `/api/upload/nas/${encoded}`;
  }
  return fileUrl;
}
