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

  console.log(`[Playback CLI] Fetching historical trace from ${startTime} to ${endTime}...`);
  const timeline = await engine.getEventsInRange(startTime, endTime);
  console.log(`[Playback CLI] Loaded ${timeline.length} events.`);

  if (timeline.length === 0) {
    console.log("[Playback CLI] No events found in timeframe.");
    rl.close();
    return;
  }

  console.log("\n========================================================");
  console.log("[Playback Controls]");
  console.log("  Press [Enter] to step through to the next event");
  console.log("  Type 'ff' and press [Enter] to fast-forward all events");
  console.log("========================================================\n");

  let fastForward = false;

  for (let i = 0; i < timeline.length; i++) {
    const item = timeline[i];
    
    if (!fastForward) {
      const input = await askQuestion(`[Event ${i + 1}/${timeline.length}] Press Enter to step (or type 'ff' to fast-forward): `);
      if (input.trim().toLowerCase() === "ff") {
        fastForward = true;
      }
    }

    console.log(`\n[Playback Tick] ${new Date(item.timestamp).toLocaleTimeString()}`);
    if (item.type === "event") {
      console.log(`  EVENT  [${item.data.eventSource}] [${item.data.severity.toUpperCase()}] ${item.data.message}`);
    } else {
      console.log(`  METRIC [${item.data.nodeId}] ${item.data.metricName} = ${item.data.metricValue}`);
    }
    
    if (fastForward) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  console.log("\n[Playback CLI] Playback finished successfully!");
  rl.close();
}

run().catch((err) => {
  console.error(err);
  rl.close();
});
