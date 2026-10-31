process.env.NEXT_RUNTIME = "nodejs";
process.env.NEXT_PHASE = "phase-production-build";

import { register } from "../../../../instrumentation";

register().then(() => {
  // Query text with interpolated literals AND params:
  const realDrizzleError = new Error(
    "Failed query: INSERT INTO users (email, token) VALUES ('secret_user@example.com', 'super_secret_jwt_token')\nparams: secret_user@example.com, super_secret_jwt_token"
  );
  (realDrizzleError as any).code = "23505";
  Promise.reject(realDrizzleError);

  setTimeout(() => {
    process.stdout.write("PII_TEST_DONE\n");
    process.exit(0);
  }, 100);
});
