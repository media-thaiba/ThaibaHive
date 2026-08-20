import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpaceDiscoveryCanvas } from '@/components/twin/portal/space-discovery-canvas';

describe('Space Discovery Canvas Stakeholder UI', () => {
  it('should render space discovery cards with comfort indicators and allow booking', () => {
    render(<SpaceDiscoveryCanvas />);
    expect(screen.getByPlaceholderText(/Search study spaces/i)).toBeInTheDocument();
    expect(screen.getByText(/Robotics & AI Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/Biotech Collaboration Pod/i)).toBeInTheDocument();

    const bookBtns = screen.getAllByText(/Book Room/i);
    expect(bookBtns.length).toBeGreaterThan(0);

    fireEvent.click(bookBtns[0]);
    expect(screen.getByText(/Book Space: Robotics & AI Studio/i)).toBeInTheDocument();
  });
});
