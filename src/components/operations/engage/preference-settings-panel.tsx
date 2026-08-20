'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export function PreferenceSettingsPanel({ recipientId = 'student_current_user' }: { recipientId?: string }) {
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [pushOptIn, setPushOptIn] = useState(true);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/engage/preferences?recipientId=${recipientId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.preferences) {
          const p = data.preferences;
          if (p.channelPreferences) {
            try {
              const cp = typeof p.channelPreferences === 'string' ? JSON.parse(p.channelPreferences) : p.channelPreferences;
              if (cp.email !== undefined) setEmailOptIn(cp.email);
              if (cp.sms !== undefined) setSmsOptIn(cp.sms);
              if (cp.push !== undefined) setPushOptIn(cp.push);
            } catch {}
          }
          if (p.quietHoursStart) setQuietHoursStart(p.quietHoursStart);
          if (p.quietHoursEnd) setQuietHoursEnd(p.quietHoursEnd);
        }
      })
      .catch(() => {});
  }, [recipientId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      await fetch('/api/engage/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId,
          channelPreferences: {
            email: emailOptIn,
            sms: smsOptIn,
            push: pushOptIn,
          },
          quietHoursStart,
          quietHoursEnd,
        }),
      });
      setSavedSuccess(true);
    } catch {
      alert('Failed to save communication preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span>Communication & Privacy Preferences (GDPR/FERPA)</span>
          <Badge variant="info">Consent Center</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {savedSuccess && (
          <div className="p-3 mb-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-sm">
            Preferences saved successfully.
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Notification Channels</h4>
            <div className="flex flex-col gap-3">
              <Label className="flex items-center gap-3 cursor-pointer">
                <Input
                  type="checkbox"
                  checked={emailOptIn}
                  onChange={(e) => setEmailOptIn(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span>Email Notifications (Course grades, fee invoices, campus bulletins)</span>
              </Label>

              <Label className="flex items-center gap-3 cursor-pointer">
                <Input
                  type="checkbox"
                  checked={smsOptIn}
                  onChange={(e) => setSmsOptIn(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span>SMS Notifications (Urgent class rescheduling, bus delays)</span>
              </Label>

              <Label className="flex items-center gap-3 cursor-pointer">
                <Input
                  type="checkbox"
                  checked={pushOptIn}
                  onChange={(e) => setPushOptIn(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span>Mobile App Push Notifications</span>
              </Label>
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-semibold">Quiet Hours Window</h4>
            <p className="text-xs text-muted-foreground">
              Non-emergency notifications sent during these hours will be automatically deferred.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quiet-start" className="text-xs">Quiet Hours Start</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="quiet-end" className="text-xs">Quiet Hours End</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving Preferences...' : 'Save Preferences'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
