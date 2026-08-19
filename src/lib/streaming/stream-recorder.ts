export interface StreamRecordingMetadata {
  recordingId: string;
  streamId: string;
  roomId: string;
  tenantId: string;
  durationSeconds: number;
  fileSizeBytes: number;
  recordingUrl: string;
  recordedAt: number;
}

export class StreamRecorder {
  private activeRecordings: Map<string, { startTime: number; chunksCount: number }> = new Map();

  public startRecording(recordingId: string, streamId: string, roomId: string, tenantId: string): void {
    this.activeRecordings.set(recordingId, {
      startTime: Date.now(),
      chunksCount: 0,
    });
  }

  public recordChunk(recordingId: string): void {
    const rec = this.activeRecordings.get(recordingId);
    if (rec) {
      rec.chunksCount += 1;
    }
  }

  public stopRecording(recordingId: string, streamId: string, roomId: string, tenantId: string): StreamRecordingMetadata {
    const rec = this.activeRecordings.get(recordingId);
    const durationSeconds = rec ? Math.round((Date.now() - rec.startTime) / 1000) : 0;
    const fileSizeBytes = (rec ? rec.chunksCount : 10) * 1024 * 512; // Simulated byte calculation

    this.activeRecordings.delete(recordingId);

    return {
      recordingId,
      streamId,
      roomId,
      tenantId,
      durationSeconds: Math.max(1, durationSeconds),
      fileSizeBytes,
      recordingUrl: `/api/streaming/recordings/${recordingId}.mp4`,
      recordedAt: Date.now(),
    };
  }
}
