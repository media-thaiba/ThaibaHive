import React from 'react';
import { render, screen } from '@testing-library/react';
import { VisionRadarTab } from '../../../../components/operations/vision/vision-radar-tab';

describe('VisionRadarTab UI Component Tests', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/api/vision/cameras')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              cameras: [
                { cameraId: 'cam_gate_01', name: 'Main Campus Gate', status: 'online', zoneType: 'entrance', fps: 30 },
              ],
            }),
        });
      }
      if (url.includes('/api/vision/alerts')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              alerts: [],
            }),
        });
      }
      if (url.includes('/api/vision/lockdown')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              lockdowns: [],
            }),
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve({}),
      });
    });
  });

  it('should render 3D vision radar cards and active camera feed status', async () => {
    render(<VisionRadarTab />);

    expect(await screen.findByText('TWIN-OPS Spatial Vision Radar (3D FOV Frustums)')).toBeInTheDocument();
    expect(await screen.findByText('Active IP Cameras')).toBeInTheDocument();
    expect(await screen.findByText('3D Frustum Coverage')).toBeInTheDocument();
    expect(await screen.findByText('Main Campus Gate')).toBeInTheDocument();
  });
});
