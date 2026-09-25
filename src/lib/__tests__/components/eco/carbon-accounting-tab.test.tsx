import React from 'react';
import { render, screen } from '@testing-library/react';
import { CarbonAccountingTab } from '../../../../components/operations/eco/carbon-accounting-tab';

describe('CarbonAccountingTab UI Component Tests', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            result: {
              totalGrossEmissionsKg: 10450.0,
              totalNetEmissionsKg: 8450.0,
              retiredOffsetsDeductedKg: 2000.0,
              breakdown: {
                scope1Kg: 1025.0,
                scope2LocationKg: 6375.0,
                scope2MarketKg: 5100.0,
                scope3Kg: 3050.0,
              },
              departmentSummaries: [
                { departmentId: 'dept_cs', departmentName: 'Computer Science', grossEmissionsKg: 3450, netEmissionsKg: 2850, scope1Kg: 250, scope2Kg: 2200, scope3Kg: 1000, perCapitaKg: 14.2 },
              ],
              buildingEcoScores: [],
              merkleProofHash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
              calculatedAt: '2026-08-21T12:00:00.000Z',
            },
          }),
      })
    );
  });

  it('should render GHG Scope 1/2/3 breakdown cards and departmental leaderboard', async () => {
    render(<CarbonAccountingTab />);

    expect(await screen.findByText('Scope 1 Direct')).toBeInTheDocument();
    expect(await screen.findByText(/1\.02\s*t/)).toBeInTheDocument();
    expect(await screen.findByText('Automated ESG Disclosure Generator')).toBeInTheDocument();
    expect(await screen.findByText('Departmental Carbon Accountability Leaderboard')).toBeInTheDocument();
    expect(await screen.findByText('Computer Science')).toBeInTheDocument();
  });
});
