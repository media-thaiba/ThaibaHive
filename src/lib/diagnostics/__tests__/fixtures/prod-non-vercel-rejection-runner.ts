process.env.NEXT_RUNTIME = "nodejs";
(process.env as any).NODE_ENV = "production";
process.env.SKIP_ENV_VALIDATION = "true";
process.env.EXIT_ON_UNHANDLED_REJECTION = "1";
process.env.NEXT_PHASE = "phase-production-build"; // skip mesh

import { register } from "../../../../instrumentation";

register().then(() => {
  Promise.reject(new Error("Opt-in container unhandled rejection"));

  setTimeout(() => {
    process.stdout.write("UNEXPECTED_SURVIVAL\n");
    process.exit(0);
  }, 200);
});
