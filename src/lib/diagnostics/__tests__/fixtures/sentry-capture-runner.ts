process.env.NEXT_RUNTIME = "nodejs";
process.env.NEXT_PHASE = "phase-production-build"; // skip mesh
process.env.SENTRY_DSN = "https://public@sentry.example.com/1";

import { register } from "../../../../instrumentation";

register().then(() => {
  const piiErr = new Error("Failed query: SELECT * FROM users WHERE email = 'secret_user@example.com'\nparams: super_secret_jwt_token");
  (piiErr as any).code = "23505";
  (piiErr as any).cause = {
    code: "23505",
    message: "unique constraint on email 'secret_user@example.com'",
  };

  Promise.reject(piiErr);

  setTimeout(() => {
    process.stdout.write("SENTRY_TEST_COMPLETED\n");
    process.exit(0);
  }, 100);
});
