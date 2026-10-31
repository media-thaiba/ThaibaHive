process.env.NEXT_RUNTIME = "nodejs";
(process.env as any).NODE_ENV = "production";
process.env.SKIP_ENV_VALIDATION = "true";
delete process.env.EXIT_ON_UNHANDLED_REJECTION;
process.env.NEXT_PHASE = "phase-production-build"; // skip mesh

import { register } from "../../../../instrumentation";

register().then(() => {
  Promise.reject(new Error("Default unhandled rejection leaves process alive"));

  setTimeout(() => {
    process.stdout.write("PROCESS_SURVIVED_DEFAULT\n");
    process.exit(0);
  }, 100);
});
