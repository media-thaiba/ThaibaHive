import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThreatDetectionTab } from '../../../../components/operations/vision/threat-detection-tab';

describe('ThreatDetectionTab UI Component Tests', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/api/vision/alerts')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              alerts: [
                {
                  alertId: 'alt_999',
                  cameraId: 'cam_gate_01',
                  threatType: 'perimeter_intrusion',
                  severity: 'critical',
                  confidenceScore: 0.95,
                  status: 'active',
                  detectedAt: '2026-08-21T10:00:00Z',
                },
              ],
            }),
        });
      }
      if (url.includes('/api/vision/incidents')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              incidents: [
                {
                  incidentId: 'inc_555',
                  title: 'Perimeter Breach at Science Wing',
                  threatType: 'perimeter_intrusion',
                  severity: 'critical',
                  status: 'open',
                  occurredAt: '2026-08-21T10:00:00Z',
                },
              ],
            }),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
  });

  it('should render threat alerts and CAP incident table rows', async () => {
    render(<ThreatDetectionTab />);

    expect(await screen.findByText('Real-Time AI Threat Detection Stream')).toBeInTheDocument();
    expect(await screen.findByText('alt_999')).toBeInTheDocument();
    expect((await screen.findAllByText('CRITICAL')).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText('Perimeter Breach at Science Wing')).toBeInTheDocument();
  });
});
