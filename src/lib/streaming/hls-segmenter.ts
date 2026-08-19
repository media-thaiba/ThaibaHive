export interface HlsSegment {
  sequenceId: number;
  durationSeconds: number;
  uri: string;
  timestamp: number;
}

export class HlsSegmenter {
  private segments: Map<string, HlsSegment[]> = new Map();
  private sequenceCounter: Map<string, number> = new Map();

  public addSegment(streamId: string, durationSeconds: number = 2.0): HlsSegment {
    const streamSegments = this.segments.get(streamId) || [];
    const seq = (this.sequenceCounter.get(streamId) || 0) + 1;
    this.sequenceCounter.set(streamId, seq);

    const segment: HlsSegment = {
      sequenceId: seq,
      durationSeconds,
      uri: `/api/streaming/segments/${streamId}_seq${seq}.ts`,
      timestamp: Date.now(),
    };

    streamSegments.push(segment);
    // Keep sliding window of last 10 segments for live playlist
    if (streamSegments.length > 10) {
      streamSegments.shift();
    }

    this.segments.set(streamId, streamSegments);
    return segment;
  }

  public generateMasterPlaylist(streamId: string): string {
    return `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-INDEPENDENT-SEGMENTS

#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1920x1080,FRAME-RATE=30.000,CODECS="avc1.64002a,mp4a.40.2"
/api/streaming/streams/${streamId}/hls?quality=1080p

#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=1280x720,FRAME-RATE=30.000,CODECS="avc1.4d401f,mp4a.40.2"
/api/streaming/streams/${streamId}/hls?quality=720p

#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=854x480,FRAME-RATE=30.000,CODECS="avc1.4d401e,mp4a.40.2"
/api/streaming/streams/${streamId}/hls?quality=480p
`;
  }

  public generateVariantPlaylist(streamId: string): string {
    const streamSegments = this.segments.get(streamId) || [];
    const targetDuration = Math.ceil(
      streamSegments.reduce((max, s) => Math.max(max, s.durationSeconds), 2.0)
    );
    const mediaSequence = streamSegments.length > 0 ? streamSegments[0].sequenceId : 1;

    let playlist = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:${targetDuration}
#EXT-X-MEDIA-SEQUENCE:${mediaSequence}
#EXT-X-DISCONTINUITY-SEQUENCE:0
`;

    for (const seg of streamSegments) {
      playlist += `#EXTINF:${seg.durationSeconds.toFixed(3)},\n${seg.uri}\n`;
    }

    return playlist;
  }
}
