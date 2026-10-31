process.env.NEXT_RUNTIME = "nodejs";
delete process.env.NEXT_PHASE; // Runtime, NOT build phase

import { EventBus } from "../../../observability/event-bus";
// Force EventBus.getInstance to throw to simulate runtime mesh failure deterministically
EventBus.getInstance = () => {
  throw new Error("Simulated Redis/EventBus mesh initialization crash");
};

import { register } from "../../../../instrumentation";

register()
  .then(() => {
    process.stdout.write("RUNTIME_REGISTER_RESOLVED\n");
    setTimeout(() => {
      process.exit(0);
    }, 150);
  })
  .catch((err) => {
    process.stderr.write("UNEXPECTED_REGISTER_REJECTION: " + (err?.message || err) + "\n");
    process.exit(1);
  });
