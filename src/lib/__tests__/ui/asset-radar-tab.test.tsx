import React from 'react';
import { render, screen } from '@testing-library/react';
import { AssetRadarTab } from '@/components/twin/admin/asset-radar-tab';
import { EmergencySimulatorTab } from '@/components/twin/admin/emergency-simulator-tab';
import { IotSensorMeshTab } from '@/components/twin/admin/iot-sensor-mesh-tab';

describe('Asset Radar, Sensor Mesh & Emergency Simulator Tabs UI', () => {
  it('should render Asset Radar with live tracking table', () => {
    render(<AssetRadarTab />);
    expect(screen.getByText(/Physical Asset RTLS Radar/i)).toBeInTheDocument();
    expect(screen.getByText(/Mass Spectrometer/i)).toBeInTheDocument();
  });

  it('should render Sensor Mesh Tab with live health list', () => {
    render(<IotSensorMeshTab />);
    expect(screen.getByText(/Campus IoT Sensor Mesh Telemetry/i)).toBeInTheDocument();
    expect(screen.getByText(/SEN-AIR-101/i)).toBeInTheDocument();
  });

  it('should render Emergency Simulator and run simulation', () => {
    render(<EmergencySimulatorTab />);
    expect(screen.getByText(/Dynamic 3D Emergency Evacuation/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulate Fire Evacuation/i)).toBeInTheDocument();
  });
});
