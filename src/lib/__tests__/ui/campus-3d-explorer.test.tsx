import React from 'react';
import { render, screen } from '@testing-library/react';
import { Campus3dExplorerTab } from '@/components/twin/admin/campus-3d-explorer-tab';

describe('Campus 3D Explorer Admin Tab UI', () => {
  it('should render 3D Explorer with building name, viewport, and telemetry sidebar', () => {
    render(<Campus3dExplorerTab />);
    expect(screen.getByText(/Science & Engineering Complex/i)).toBeInTheDocument();
    expect(screen.getByText(/Science Complex Radar/i)).toBeInTheDocument();
    expect(screen.getByText(/Average Comfort Index/i)).toBeInTheDocument();
  });
});
