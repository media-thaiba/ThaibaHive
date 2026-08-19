import { AgentStateStore } from "../core/state-store";
import { ConsensusCoordinator } from "../core/consensus";

export interface StreamNodeMetrics {
  nodeId: string;
  signalingLatencyMs: number;
  segmenterErrorCount: number;
  isHealthy: boolean;
}

export class StreamHealer {
  private agentId = "agent-stream-healer";
  private stateStore = AgentStateStore.getInstance();
  private consensus = ConsensusCoordinator.getInstance();

  // Simulated commands run
  public executedRestarts: string[] = [];
  public activeStreamsRoute = new Map<string, string>(); // roomId -> endpoint

  constructor() {}

  public async checkStreamingNodes(nodes: StreamNodeMetrics[], roomId?: string): Promise<void> {
    await this.stateStore.saveAgent(this.agentId, "stream-healer", "1.0.0", "active");

    for (const node of nodes) {
      const lockKey = `stream:${node.nodeId}`;

      // 1. Signaling Latency healing
      if (node.signalingLatencyMs > 500) {
        await this.stateStore.log(
          this.agentId,
          "warn",
          `Stream node ${node.nodeId} signaling latency is high: ${node.signalingLatencyMs}ms. Initiating signaling recovery.`
        );

        if (await this.consensus.checkCooldown(lockKey)) continue;
        const lock = await this.consensus.acquireLease(lockKey, this.agentId, 30);
        if (!lock) continue;

        await this.stateStore.updateStatus(this.agentId, "remediating");

        // Action: Restart signaling service
        this.executedRestarts.push(`${node.nodeId}:signaling`);
        
        await this.stateStore.logDecision(
          this.agentId,
          node.nodeId,
          "high",
          `Restart signaling service on node ${node.nodeId}`,
          "success",
          JSON.stringify({ nodeId: node.nodeId, latency: node.signalingLatencyMs })
        );

        await this.consensus.setCooldown(lockKey, 120); // 2 minutes cooldown
        await this.consensus.releaseLease(lockKey, this.agentId);
        await this.stateStore.updateStatus(this.agentId, "idle");
      }

      // 2. Failed HLS transcoder processes segment errors
      if (node.segmenterErrorCount > 3) {
        await this.stateStore.log(
          this.agentId,
          "warn",
          `Stream node ${node.nodeId} HLS segmenter has accumulated ${node.segmenterErrorCount} errors. Resetting transcoder.`
        );

        if (await this.consensus.checkCooldown(lockKey)) continue;
        const lock = await this.consensus.acquireLease(lockKey, this.agentId, 30);
        if (!lock) continue;

        await this.stateStore.updateStatus(this.agentId, "remediating");

        // Action: Reset HLS transcoder
        this.executedRestarts.push(`${node.nodeId}:transcoder`);

        await this.stateStore.logDecision(
          this.agentId,
          node.nodeId,
          "medium",
          `Reset HLS transcoder process on node ${node.nodeId}`,
          "success",
          JSON.stringify({ nodeId: node.nodeId, errors: node.segmenterErrorCount })
        );

        await this.consensus.setCooldown(lockKey, 120);
        await this.consensus.releaseLease(lockKey, this.agentId);
        await this.stateStore.updateStatus(this.agentId, "idle");
      }

      // 3. Fallback to backup streaming endpoints if node is unhealthy
      if (!node.isHealthy && roomId) {
        await this.stateStore.log(
          this.agentId,
          "error",
          `Stream node ${node.nodeId} has failed completely. Redirecting room ${roomId} to backup.`
        );

        if (await this.consensus.checkCooldown(`route:${roomId}`)) continue;
        const lock = await this.consensus.acquireLease(`route:${roomId}`, this.agentId, 30);
        if (!lock) continue;

        await this.stateStore.updateStatus(this.agentId, "remediating");

        // Action: Redirect stream
        const backupEndpoint = `https://backup-stream.thaibahive.local/room/${roomId}`;
        this.activeStreamsRoute.set(roomId, backupEndpoint);

        await this.stateStore.logDecision(
          this.agentId,
          roomId,
          "high",
          `Redirect room ${roomId} streaming endpoint to backup node`,
          "success",
          JSON.stringify({ roomId, failedNodeId: node.nodeId, backupUrl: backupEndpoint })
        );

        await this.consensus.setCooldown(`route:${roomId}`, 300); // 5 mins cooldown
        await this.consensus.releaseLease(`route:${roomId}`, this.agentId);
        await this.stateStore.updateStatus(this.agentId, "idle");
      }
    }
  }
}
