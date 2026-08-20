import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import EngageOsPage from '@/app/(shell)/admin/operations/engage-os/page';

beforeEach(() => {
  global.fetch = jest.fn((url: any) => {
    if (url.includes('/api/engage/campaigns')) {
      return Promise.resolve({
        json: () => Promise.resolve({ campaigns: [] }),
      });
    }
    if (url.includes('/api/engage/workflows')) {
      return Promise.resolve({
        json: () => Promise.resolve({ workflows: [] }),
      });
    }
    if (url.includes('/api/engage/analytics')) {
      return Promise.resolve({
        json: () => Promise.resolve({
          overview: {
            funnel: { dispatched: 10, delivered: 10, opened: 8, clicked: 4, responded: 2, deliveryRate: 1.0, openRate: 0.8, ctr: 0.5 },
            channelBreakdown: [],
            hourlyHeatmap: [],
            averageSentimentScore: 0.7,
          },
        }),
      });
    }
    return Promise.resolve({
      json: () => Promise.resolve({}),
    });
  }) as any;
});

describe('EngageOS Admin Radar UI Suite', () => {
  it('should render page title and all 5 navigation tabs without act warnings', async () => {
    await act(async () => {
      render(<EngageOsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Unified Multi-Modal Communication/i)).toBeInTheDocument();
      expect(screen.getByText('Live Dispatch Radar')).toBeInTheDocument();
      expect(screen.getByText('Campaign Studio & A/B')).toBeInTheDocument();
      expect(screen.getByText('Workflow Canvas')).toBeInTheDocument();
      expect(screen.getByText('Conversational Hub')).toBeInTheDocument();
      expect(screen.getByText('Engagement Analytics')).toBeInTheDocument();
    });
  });
});
