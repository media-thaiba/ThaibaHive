/**
 * QA-11: validates that a post-authentication redirect target is a same-site
 * path. Blocks protocol-relative URLs (`//evil.com`), backslash variants that
 * browsers normalize to external URLs (`/\evil.com`), and anything that is
 * not a rooted path.
 */
export function isSafeInternalPath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length === 0) return false;
  return (
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.startsWith('/\\') &&
    !path.includes('\\')
  );
}
