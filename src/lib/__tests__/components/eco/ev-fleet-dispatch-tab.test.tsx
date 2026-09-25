import React from 'react';
import { render, screen } from '@testing-library/react';
import { EvFleetDispatchTab } from '../../../../components/operations/eco/ev-fleet-dispatch-tab';

describe('EvFleetDispatchTab UI Component Tests', () => {
  it('should render V2G grid feed header and fleet status table', () => {
    render(<EvFleetDispatchTab />);

    expect(screen.getByText('Active V2G Fleet Grid Feed')).toBeInTheDocument();
    expect(screen.getByText('Campus Shuttle Bus Alpha')).toBeInTheDocument();
    expect(screen.getAllByText('V2G DISCHARGING').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Dispatch V2G Fleet')).toBeInTheDocument();
  });
});
