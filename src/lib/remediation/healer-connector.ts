import { DatabaseHealer } from "../agents/healing/database-healer";
import { PoolHealer } from "../agents/healing/pool-healer";
import { StreamHealer } from "../agents/healing/stream-healer";
import { EdgeHealer } from "../agents/healing/edge-healer";
import * as crypto from "crypto";

export class HealerConnector {
  private static secret = process.env.HEALER_SECRET || "default_healer_secret";

  static generateToken(action: string, timestamp: number): string {
    const data = `${action}:${timestamp}`;
    return crypto.createHmac("sha256", this.secret).update(data).digest("hex");
  }

  static verifyToken(action: string, timestamp: number, token: string): boolean {
    const now = Date.now();
    // Validate timestamp fence: must be within 10 seconds (10000 ms)
    if (Math.abs(now - timestamp) > 10000) {
      return false;
    }
    const expected = this.generateToken(action, timestamp);
    
    try {
      return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
    } catch (e) {
      return false;
    }
  }

  async executeHealer(action: string): Promise<boolean> {
    const timestamp = Date.now();
    const token = HealerConnector.generateToken(action, timestamp);

    // Verify token locally before executing
    if (!HealerConnector.verifyToken(action, timestamp, token)) {
      throw new Error("Invalid or expired token signature");
    }

    const executionPromise = (async () => {
      if (action === "database-healer") {
        const healer = new DatabaseHealer();
        await healer.checkHealth();
      } else if (action === "pool-healer") {
        const healer = new PoolHealer();
        await healer.monitorPools([]);
      } else if (action === "stream-healer") {
        const healer = new StreamHealer();
        await healer.checkStreamingNodes([]);
      } else {
        const healer = new EdgeHealer();
        await healer.checkHealth([]);
      }
      return true;
    })();

    // 60-second timeout handling
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      const timer = setTimeout(() => reject(new Error("Healer execution timeout")), 60000);
      executionPromise.finally(() => clearTimeout(timer));
    });

    return Promise.race([executionPromise, timeoutPromise]);
  }
}
