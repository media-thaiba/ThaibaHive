import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatWidgetDrawer } from '@/components/operations/engage/chat-widget-drawer';
import { PreferenceSettingsPanel } from '@/components/operations/engage/preference-settings-panel';

beforeEach(() => {
  global.fetch = jest.fn((url: any) => {
    return Promise.resolve({
      json: () => Promise.resolve({ preferences: { quietHoursStart: '22:00', quietHoursEnd: '07:00' } }),
    });
  }) as any;
});

describe('Stakeholder Engagement UI Components Test Suite', () => {
  it('should toggle chat drawer open and display welcome prompt', () => {
    render(<ChatWidgetDrawer stakeholderId="student_1" />);
    const triggerBtn = screen.getByRole('button');
    fireEvent.click(triggerBtn);

    expect(screen.getByText('Campus Virtual Assistant')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your question...')).toBeInTheDocument();
  });

  it('should render communication preferences and quiet hours controls', async () => {
    render(<PreferenceSettingsPanel recipientId="student_1" />);
    expect(screen.getByText(/Communication & Privacy Preferences/i)).toBeInTheDocument();
    expect(screen.getByText(/Email Notifications/i)).toBeInTheDocument();
    expect(screen.getByText(/Quiet Hours Window/i)).toBeInTheDocument();
  });
});
