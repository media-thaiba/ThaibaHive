import React from 'react';
import { render, screen } from '@testing-library/react';
import { GreenCampusPortal } from '../../../../components/operations/eco/public/green-campus-portal';

describe('GreenCampusPortal & StudentCarbonGamificationCard UI Tests', () => {
  it('should render public transparency portal KPIs and student carbon wallet', () => {
    render(<GreenCampusPortal />);

    expect(screen.getByText('Towards a Net-Zero 2030 Campus')).toBeInTheDocument();
    expect(screen.getByText('Live Solar Output')).toBeInTheDocument();
    expect(screen.getByText('245.5 kW')).toBeInTheDocument();
    expect(screen.getByText('Student Eco-Passport & Carbon Wallet')).toBeInTheDocument();
    expect(screen.getByText('380 Green Points')).toBeInTheDocument();
    expect(screen.getByText('Green Commuter')).toBeInTheDocument();
  });
});
