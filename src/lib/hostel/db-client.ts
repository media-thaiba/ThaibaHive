/**
 * Resolves a raw database driver client (LibSQL or Postgres / PGlite)
 * from a Drizzle ORM instance or returns the client directly.
 */
export function resolveHostelClient(databaseOrClient: any): any {
  if (!databaseOrClient) {
    throw new Error("Database client cannot be null or undefined");
  }

  // Already a raw driver client (LibSQL client or pg.Pool / pg.Client / PGlite)
  if (
    typeof databaseOrClient.execute === "function" ||
    (typeof databaseOrClient.query === "function" && typeof databaseOrClient.select !== "function")
  ) {
    return databaseOrClient;
  }

  // Drizzle ORM instance unwrapping
  if (databaseOrClient.$client) {
    return databaseOrClient.$client;
  }

  if (databaseOrClient.session?.client) {
    return databaseOrClient.session.client;
  }

  if (databaseOrClient.client) {
    return databaseOrClient.client;
  }

  return databaseOrClient;
}
