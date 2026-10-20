/**
 * Walks the error cause chain (drizzle wraps driver errors as
 * "Failed query: ..." with the original driver error on `error.cause`)
 * and reports whether a SQLite or PostgreSQL UNIQUE constraint violation occurred.
 */
export function isUniqueConstraintViolation(
  error: unknown,
  columnFragment?: string
): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    const message = current instanceof Error ? current.message : String(current);
    const code =
      current && typeof current === "object" && "code" in current
        ? String((current as { code?: unknown }).code)
        : "";
    const detail =
      current && typeof current === "object" && "detail" in current
        ? String((current as { detail?: unknown }).detail)
        : "";
    const constraint =
      current && typeof current === "object" && "constraint" in current
        ? String((current as { constraint?: unknown }).constraint)
        : "";

    const isSqliteUnique = /UNIQUE constraint failed/i.test(message);
    const isPgUnique =
      code === "23505" || /duplicate key value violates unique constraint/i.test(message);

    if (isSqliteUnique || isPgUnique) {
      if (!columnFragment) {
        return true;
      }
      const haystack = `${message} ${detail} ${constraint}`.toLowerCase();
      if (haystack.includes(columnFragment.toLowerCase())) {
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
