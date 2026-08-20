import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpaceOptimizationTab } from '@/components/twin/admin/space-optimization-tab';

describe('Space Optimization Studio Admin Tab UI', () => {
  it('should render KPI metrics and allow approving space reallocations', () => {
    render(<SpaceOptimizationTab />);
    expect(screen.getByText(/Campus Space Efficiency/i)).toBeInTheDocument();
    expect(screen.getByText(/Autonomous Space Reallocation Proposals/i)).toBeInTheDocument();

    const applyBtns = screen.getAllByText(/Apply Reallocation/i);
    expect(applyBtns.length).toBeGreaterThan(0);

    fireEvent.click(applyBtns[0]);
    expect(screen.getByText(/Applied/i)).toBeInTheDocument();
  });
});
