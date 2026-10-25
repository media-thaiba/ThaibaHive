export function validateSpikeDatabaseUrl(rawUrl: string): URL {
  if (!rawUrl) {
    throw new Error("SPIKE_DATABASE_URL environment variable is required.");
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (err) {
    throw new Error(`Invalid SPIKE_DATABASE_URL: ${String(err)}`);
  }

  // 1. Host check
  if (!["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    throw new Error(
      `SECURITY REFUSAL: Spike database host must be localhost or 127.0.0.1 (got: '${parsed.hostname}')`
    );
  }

  // 2. Port check
  if (parsed.port !== "54329") {
    throw new Error(
      `SECURITY REFUSAL: Spike database port must be 54329 (got: '${parsed.port}')`
    );
  }

  // 3. Database name check
  const dbName = parsed.pathname.replace(/^\//, "");
  if (!dbName.startsWith("spike_")) {
    throw new Error(
      `SECURITY REFUSAL: Spike database name must start with 'spike_' (got: '${dbName}')`
    );
  }

  return parsed;
}
