import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SafetyStatusCanvas } from '../../../components/portal/safety-status-canvas';

describe('SafetyStatusCanvas UI Component Tests', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true }),
      })
    );
  });

  it('should render campus safety status banner and action buttons', () => {
    render(<SafetyStatusCanvas />);

    expect(screen.getByText('Campus Safety Status: Normal')).toBeInTheDocument();
    expect(screen.getByText('Request SafeWalk Escort')).toBeInTheDocument();
    expect(screen.getByText('Report Concern')).toBeInTheDocument();
  });

  it('should trigger SafeWalk escort confirmation upon clicking request button', async () => {
    render(<SafetyStatusCanvas />);

    const safeWalkBtn = screen.getByText('Request SafeWalk Escort');
    fireEvent.click(safeWalkBtn);

    expect(await screen.findByText('SafeWalk Escort En Route')).toBeInTheDocument();
    expect(screen.getByText(/ETA: 2 minutes/i)).toBeInTheDocument();
  });
});
