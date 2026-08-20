'use client';

import React from 'react';
import { PreferenceSettingsPanel } from '@/components/operations/engage/preference-settings-panel';
import { ChatWidgetDrawer } from '@/components/operations/engage/chat-widget-drawer';

export default function StakeholderEngagementPortalPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Stakeholder Engagement & Communication Center</h1>
        <p className="text-muted-foreground">
          Manage your communication preferences, quiet hours, and channel subscriptions.
        </p>
      </div>

      <PreferenceSettingsPanel />
      <ChatWidgetDrawer />
    </div>
  );
}
