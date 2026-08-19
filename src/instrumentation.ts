export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { initRevocationMesh } = await import("@/lib/identity/revocation-mesh");
      initRevocationMesh();
    } catch {
      // Ignore during build phase
    }
  }
}
