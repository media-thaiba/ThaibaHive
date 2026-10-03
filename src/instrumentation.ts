export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Validate required production environment variables on startup
    if (process.env.NODE_ENV === "production" && process.env.SKIP_ENV_VALIDATION !== "true") {
      const { validateProductionStartupOrThrow } = await import("@/lib/config/env-validation");
      validateProductionStartupOrThrow(process.env);
    }

    try {
      const { initRevocationMesh } = await import("@/lib/identity/revocation-mesh");
      initRevocationMesh();
    } catch {
      // Ignore during build phase
    }
  }
}
