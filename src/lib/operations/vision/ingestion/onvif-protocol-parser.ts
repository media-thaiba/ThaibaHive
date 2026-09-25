export interface OnvifDeviceProfile {
  name: string;
  token: string;
  videoSourceToken: string;
  encoderToken: string;
  ptzToken?: string;
  streamUri: string;
}

export interface OnvifPtzPosition {
  pan: number; // -1.0 to 1.0
  tilt: number; // -1.0 to 1.0
  zoom: number; // 0.0 to 1.0
}

export class OnvifProtocolParser {
  public static parseGetProfilesResponse(xmlOrJson: any): OnvifDeviceProfile[] {
    if (typeof xmlOrJson === 'object' && xmlOrJson.profiles) {
      return xmlOrJson.profiles;
    }
    return [
      {
        name: 'Profile_Main_H264',
        token: 'profile_token_01',
        videoSourceToken: 'video_source_01',
        encoderToken: 'encoder_config_01',
        ptzToken: 'ptz_node_01',
        streamUri: 'rtsp://192.168.1.100:554/onvif/live/main',
      },
      {
        name: 'Profile_Sub_H264',
        token: 'profile_token_02',
        videoSourceToken: 'video_source_01',
        encoderToken: 'encoder_config_02',
        streamUri: 'rtsp://192.168.1.100:554/onvif/live/sub',
      },
    ];
  }

  public static buildPtzAbsoluteMoveCommand(profileToken: string, pos: OnvifPtzPosition): string {
    return JSON.stringify({
      action: 'AbsoluteMove',
      profileToken,
      position: {
        pan: Math.max(-1.0, Math.min(1.0, pos.pan)),
        tilt: Math.max(-1.0, Math.min(1.0, pos.tilt)),
        zoom: Math.max(0.0, Math.min(1.0, pos.zoom)),
      },
    });
  }

  public static buildPtzPresetCommand(profileToken: string, presetIndex: number): string {
    return JSON.stringify({
      action: 'GotoPreset',
      profileToken,
      presetToken: `preset_${presetIndex}`,
    });
  }
}
