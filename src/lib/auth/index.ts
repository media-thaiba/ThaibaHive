// Re-export from @thaiba/auth package for backward compatibility
export { hashPassword, verifyPassword } from "@thaiba/auth";
export { createSession, createDPoPSession, verifySession, destroySession, createStepUpToken, verifyStepUpToken } from "@thaiba/auth";
export type { SessionPayload, DPoPSessionPayload } from "@thaiba/auth";
export { hasPermission, getRolePermissions } from "@thaiba/auth";
export { getUserInstitutionScope } from "@thaiba/auth";
export { verifyGoogleToken } from "@thaiba/auth";

