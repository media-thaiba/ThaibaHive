process.env.NEXT_RUNTIME = "nodejs";
process.env.NEXT_PHASE = "phase-production-build";

import { register } from "../../../../instrumentation";

async function run() {
  const countBeforeRejection = process.listenerCount("unhandledRejection");
  const countBeforeMonitor = process.listenerCount("uncaughtExceptionMonitor");

  await register();

  const countAfter1Rejection = process.listenerCount("unhandledRejection");
  const countAfter1Monitor = process.listenerCount("uncaughtExceptionMonitor");

  // Call register a second time
  await register();

  const countAfter2Rejection = process.listenerCount("unhandledRejection");
  const countAfter2Monitor = process.listenerCount("uncaughtExceptionMonitor");

  process.stdout.write(
    JSON.stringify({
      rejectionAdded: countAfter1Rejection - countBeforeRejection,
      monitorAdded: countAfter1Monitor - countBeforeMonitor,
      rejectionUnchangedOnSecond: countAfter2Rejection === countAfter1Rejection,
      monitorUnchangedOnSecond: countAfter2Monitor === countAfter1Monitor,
    }) + "\n"
  );
  process.exit(0);
}

run();
