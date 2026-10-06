import { logger } from "../lib/logger";
import { PlaybackEngine } from "../lib/observability/playback-engine";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function run() {
  const engine = new PlaybackEngine();
  const startTime = new Date(Date.now() - 3600000).toISOString(); 
  const endTime = new Date().toISOString();

  logger.info(`[Playback CLI] Fetching historical trace from ${startTime} to ${endTime}...`);
  const timeline = await engine.getEventsInRange(startTime, endTime);
  logger.info(`[Playback CLI] Loaded ${timeline.length} events.`);

  if (timeline.length === 0) {
    logger.info("[Playback CLI] No events found in timeframe.");
    rl.close();
    return;
  }

  logger.info("\n========================================================");
  logger.info("[Playback Controls]");
  logger.info("  Press [Enter] to step through to the next event");
  logger.info("  Type 'ff' and press [Enter] to fast-forward all events");
  logger.info("========================================================\n");

  let fastForward = false;

  for (let i = 0; i < timeline.length; i++) {
    const item = timeline[i];
    
    if (!fastForward) {
      const input = await askQuestion(`[Event ${i + 1}/${timeline.length}] Press Enter to step (or type 'ff' to fast-forward): `);
      if (input.trim().toLowerCase() === "ff") {
        fastForward = true;
      }
    }

    logger.info(`\n[Playback Tick] ${new Date(item.timestamp).toLocaleTimeString()}`);
    if (item.type === "event") {
      logger.info(`  EVENT  [${item.data.eventSource}] [${item.data.severity.toUpperCase()}] ${item.data.message}`);
    } else {
      logger.info(`  METRIC [${item.data.nodeId}] ${item.data.metricName} = ${item.data.metricValue}`);
    }
    
    if (fastForward) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  logger.info("\n[Playback CLI] Playback finished successfully!");
  rl.close();
}

run().catch((err) => {
  console.error(err);
  rl.close();
});
