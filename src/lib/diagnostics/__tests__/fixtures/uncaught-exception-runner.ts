process.env.NEXT_RUNTIME = "nodejs";
process.env.NEXT_PHASE = "phase-production-build";

import { register } from "@/instrumentation";

register().then(() => {
  // Emit fatal uncaught exception
  setTimeout(() => {
    throw new Error("Fatal uncaught exception test");
  }, 50);
});
