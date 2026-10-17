/**
 * Walks the error cause chain (drizzle wraps driver errors as
 * "Failed query: ..." with the original driver error on `error.cause`)
 * and reports whether a SQLite UNIQUE constraint violation occurred.
 */
export function isUniqueConstraintViolation(
  error: unknown,
  columnFragment?: string
): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    const message = current instanceof Error ? current.message : String(current);
    if (/UNIQUE constraint failed/i.test(message)) {
      if (!columnFragment || message.toLowerCase().includes(columnFragment.toLowerCase())) {
        return true;
      }
    }
    current =
      current instanceof Error && "cause" in current
        ? (current as { cause?: unknown }).cause
        : undefined;
  }
  return false;
}
