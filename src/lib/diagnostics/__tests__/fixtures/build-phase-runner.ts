process.env.NEXT_RUNTIME = "nodejs";
process.env.NEXT_PHASE = "phase-production-build";

import { EventBus } from "../../../observability/event-bus";

// If mesh initialization is attempted during build phase, this spy will throw immediately
EventBus.getInstance = () => {
  throw new Error("FATAL_TEST_ERROR: EventBus was accessed during build phase!");
};

import { register } from "../../../../instrumentation";

register()
  .then(() => {
    process.stdout.write("BUILD_PHASE_REGISTER_RETURNED_CLEANLY\n");
    process.exit(0);
  })
  .catch((err) => {
    process.stderr.write("BUILD_PHASE_TEST_FAILED: " + (err?.message || err) + "\n");
    process.exit(1);
  });
