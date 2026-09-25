import React from 'react';
import { render, screen } from '@testing-library/react';
import { MicrogridRadarTab } from '../../../../components/operations/eco/microgrid-radar-tab';

describe('MicrogridRadarTab UI Component Tests', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            snapshot: {
              timestamp: '2026-08-21T12:00:00.000Z',
              totalSolarGenerationKw: 245.5,
              totalFacilityLoadKw: 310.0,
              gridImportKw: 42.5,
              gridExportKw: 0.0,
              bessDischargeKw: 22.0,
              bessChargeKw: 0.0,
              evChargingLoadKw: 35.0,
              realtimeCarbonIntensityGrams: 145.0,
              powerQualityStatus: 'nominal',
            },
          }),
      })
    );
  });

  it('should render microgrid telemetry cards and power balance matrix', async () => {
    render(<MicrogridRadarTab />);

    expect(await screen.findByText('Campus Microgrid Telemetry Radar')).toBeInTheDocument();
    expect(await screen.findByText('Solar PV Output')).toBeInTheDocument();
    expect(await screen.findByText('245.5 kW')).toBeInTheDocument();
    expect(await screen.findByText('310 kW')).toBeInTheDocument();
    expect(await screen.findByText('145 g/kWh')).toBeInTheDocument();
    expect(await screen.findByText('NOMINAL')).toBeInTheDocument();
  });
});
