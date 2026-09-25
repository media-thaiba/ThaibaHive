import { StreamHealthMonitor, StreamHealthMetrics } from './stream-health-monitor';
import { OnvifProtocolParser, OnvifPtzPosition } from './onvif-protocol-parser';
import { VisionDbStore } from '../../../db/vision-store';

export interface CameraConnectionConfig {
  cameraId: string;
  protocol: 'onvif' | 'rtsp' | 'webrtc';
  streamUrl: string;
  authCredentials?: { username: string; passwordHash: string };
  requestedResolution?: string;
  targetFps?: number;
}

export class CameraGatewayAdapter {
  private healthMonitor: StreamHealthMonitor;
  private dbStore: VisionDbStore;
  private activeStreams: Map<string, CameraConnectionConfig> = new Map();

  constructor(healthMonitor?: StreamHealthMonitor, dbStore?: VisionDbStore) {
    this.healthMonitor = healthMonitor || new StreamHealthMonitor();
    this.dbStore = dbStore || VisionDbStore.getInstance();
  }

  public async connectCamera(config: CameraConnectionConfig, tenantId: string = 'global'): Promise<{
    connected: boolean;
    streamSessionId: string;
    protocol: string;
    metrics: StreamHealthMetrics;
  }> {
    this.activeStreams.set(config.cameraId, config);

    // Initial heartbeat recording
    const metrics = this.healthMonitor.recordHeartbeat(
      config.cameraId,
      config.targetFps || 30,
      4096, // 4 Mbps bitrate
      0.2,  // 0.2% packet loss
      120,  // 120ms latency
      45.0  // normal luminance variance
    );

    await this.dbStore.updateCamera(
      config.cameraId,
      {
        status: metrics.status,
        protocol: config.protocol,
        streamUrl: config.streamUrl,
      },
      tenantId
    );

    return {
      connected: true,
      streamSessionId: `session_${config.cameraId}_${Date.now()}`,
      protocol: config.protocol,
      metrics,
    };
  }

  public async executePtzCommand(
    cameraId: string,
    position: OnvifPtzPosition,
    profileToken: string = 'profile_token_01'
  ): Promise<{ success: boolean; ptzCommand: string }> {
    const stream = this.activeStreams.get(cameraId);
    if (!stream) throw new Error(`Camera ${cameraId} not connected`);

    const ptzCommand = OnvifProtocolParser.buildPtzAbsoluteMoveCommand(profileToken, position);
    return { success: true, ptzCommand };
  }

  public getHealthMonitor(): StreamHealthMonitor {
    return this.healthMonitor;
  }
}
