import React from 'react';
import { render, screen } from '@testing-library/react';
import { RenewableArbitrageTab } from '../../../../components/operations/eco/renewable-arbitrage-tab';

describe('RenewableArbitrageTab UI Component Tests', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            optimization: {
              hourlyBessActionKw: new Array(24).fill(10),
              hourlySoCPercent: new Array(24).fill(70),
              hourlyNetGridDrawKw: new Array(24).fill(50),
              baselineCostWithoutBess: 615.50,
              optimizedCostWithBess: 474.75,
              totalCostSavingsDollars: 140.75,
              savingsPercentage: 22.9,
              peakDemandShavedKw: 110.0,
            },
          }),
      })
    );
  });

  it('should render arbitrage financial KPI ribbon and 24-hour dispatch schedule', async () => {
    render(<RenewableArbitrageTab />);

    expect(await screen.findByText('24h Tariff Arbitrage Savings')).toBeInTheDocument();
    expect(await screen.findByText('$140.75')).toBeInTheDocument();
    expect(await screen.findByText('110 kW')).toBeInTheDocument();
    expect(await screen.findByText('BESS Autonomous Dispatch Controller')).toBeInTheDocument();
    expect(await screen.findByText('24-Hour Microgrid Dispatch & Arbitrage Horizon')).toBeInTheDocument();
  });
});
