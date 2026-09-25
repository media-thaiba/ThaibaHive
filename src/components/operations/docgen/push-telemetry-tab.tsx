'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export function PushTelemetryTab() {
  const [syncStatus, setSyncStatus] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testNotificationTitle, setTestNotificationTitle] = useState('Faculty Substitution Alert');
  const [testNotificationBody, setTestNotificationBody] = useState('Operating Systems class rescheduled to Period 2.');
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  const handleTestSync = () => {
    setIsSyncing(true);
    fetch('/api/docgen/mobile/sync?institutionId=inst-001')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSyncStatus(data.sync);
        }
      })
      .catch((err) => {
        console.error('Sync error:', err);
      })
      .finally(() => {
        setIsSyncing(false);
      });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Mobile Timetable Synchronization Gateway</CardTitle>
            <CardDescription>
              Broadcast incremental timetable deltas and urgent substitution schedule updates to mobile endpoints.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button disabled={isSyncing} onClick={handleTestSync}>
              {isSyncing ? 'Synchronizing Schedule Delta...' : 'Poll Mobile Sync Delta'}
            </Button>

            {syncStatus && (
              <div className="p-3 bg-muted rounded-md text-xs font-mono space-y-1">
                <div><strong>Server Timestamp:</strong> {syncStatus.serverTimestamp}</div>
                <div><strong>Sync Version:</strong> v{syncStatus.syncVersion}</div>
                <div><strong>Deltas Found:</strong> {syncStatus.timetableDeltas?.length || 0} slots</div>
                <div className="pt-2 text-foreground font-sans">
                  <Badge variant="default">SYNCHRONIZED</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Academic Push Dispatcher Test Console</CardTitle>
            <CardDescription>
              Simulate high-priority push notification dispatching to Flutter student and teacher devices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Notification Title</Label>
              <Input
                value={testNotificationTitle}
                onChange={(e) => setTestNotificationTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Notification Message</Label>
              <Input
                value={testNotificationBody}
                onChange={(e) => setTestNotificationBody(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setDispatchStatus(`Successfully dispatched to registered mobile devices at ${new Date().toLocaleTimeString()}`);
              }}
            >
              Dispatch Push Notification
            </Button>

            {dispatchStatus && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {dispatchStatus}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
