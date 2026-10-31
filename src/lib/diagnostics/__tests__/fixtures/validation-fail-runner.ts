process.env.NEXT_RUNTIME = "nodejs";
(process.env as any).NODE_ENV = "production";
delete process.env.SKIP_ENV_VALIDATION;
// In production, missing required env variables MUST cause register() to reject
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
delete process.env.SESSION_SECRET;

import { register } from "../../../../instrumentation";

register()
  .then(() => {
    process.stderr.write("UNEXPECTED_RESOLVE\n");
    process.exit(0);
  })
  .catch((err) => {
    process.stdout.write("EXPECTED_VALIDATION_REJECTION: " + (err?.message || err) + "\n");
    process.exit(42);
  });
