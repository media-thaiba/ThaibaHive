process.env.NEXT_RUNTIME = "nodejs";
process.env.NEXT_PHASE = "phase-production-build";

import { register } from "@/instrumentation";

register().then(() => {
  // Emit unhandled rejection
  Promise.reject(new Error("Test unhandled rejection payload"));

  // Check that process is still alive after rejection event
  setTimeout(() => {
    process.stdout.write("PROCESS_SURVIVED\n");
    process.exit(0);
  }, 100);
});
