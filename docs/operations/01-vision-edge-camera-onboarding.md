# SafeCampus OS: Edge Camera Onboarding & Calibration SOP (RUNBOOK-01)

## 1. Scope & Objective
This Standard Operating Procedure (SOP) governs the provisioning, network security, ONVIF discovery, and 3D spatial extrinsic calibration of IP surveillance cameras on the ThaibaHive VISION-SHIELD fabric.

## 2. Network Prerequisites & Architecture
- **VLAN Isolation**: All cameras must reside on the dedicated, non-routable `VLAN 40 (Security-Edge)`.
- **Bandwidth Budget**: 4 Mbps per 1080p stream at 30 FPS with H.264/H.265 compression.
- **Protocol Support**: ONVIF Profile S (video streaming) and Profile T (advanced analytics and PTZ commands).

## 3. Provisioning Steps
1. **Physical Mounting & Power**:
   - Mount camera at minimum 3.5m height to achieve nominal $90^\circ$ horizontal FOV.
   - Connect to PoE+ IEEE 802.3at switch port.
2. **ONVIF Discovery**:
   - Register camera via API:
     ```http
     POST /api/vision/cameras
     Content-Type: application/json

     {
       "cameraId": "cam_quad_05",
       "name": "Science Quad East Wing",
       "facilityId": "fac_science",
       "streamUrl": "rtsp://10.40.1.50:554/live",
       "protocol": "onvif",
       "fovHorizontalDeg": 90.0,
       "fovVerticalDeg": 60.0,
       "mountingHeightMeters": 3.8,
       "positionX": 45.0,
       "positionY": 12.0,
       "positionZ": 3.8,
       "pitchDeg": -15.0
     }
     ```
3. **Extrinsic Calibration & Occlusion Test**:
   - Verify initial RTSP heartbeat via `StreamHealthMonitor`.
   - Ensure luminance variance $> 10.0$ to clear lens occlusion watchdog flags.
