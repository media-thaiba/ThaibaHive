'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useEngageDispatch } from '@/lib/hooks/engage/use-engage-dispatch';

export function CampaignStudioPanel() {
  const { dispatchQuickMessage } = useEngageDispatch();
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms' | 'push' | 'inapp' | 'voice'>('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !body) return;
    setSubmitting(true);
    setSuccessMsg('');

    try {
      await dispatchQuickMessage({
        messageId: `camp_dispatch_${Date.now()}`,
        recipientId: 'cohort_all_students',
        recipientChannelAddress: channel === 'email' ? 'students-broadcast@thaiba.edu' : '+14155550000',
        channel,
        priority: 'standard',
        subject: subject || name,
        body,
      });
      setSuccessMsg(`Campaign "${name}" scheduled and dispatched across ${channel.toUpperCase()}!`);
      setName('');
      setSubject('');
      setBody('');
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch campaign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Campaign Studio & Multi-Variant Composer</span>
            <Badge variant="secondary">Studio v3.30</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {successMsg && (
            <div className="p-3 mb-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-sm">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Campaign Name</label>
              <Input
                placeholder="e.g. Fall 2026 Orientation Broadcast"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Delivery Channel</label>
                <div className="flex gap-2 mt-1">
                  {(['email', 'sms', 'push', 'inapp', 'voice'] as const).map((ch) => (
                    <Button
                      key={ch}
                      type="button"
                      variant={channel === ch ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setChannel(ch)}
                    >
                      {ch.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              {channel === 'email' && (
                <div>
                  <label className="text-sm font-medium">Subject Line</label>
                  <Input
                    placeholder="e.g. Welcome to Thaiba Campus"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Message Body / Template</label>
              <Textarea
                rows={5}
                placeholder="Compose your message... Supports dynamic variables like {{student.name}}, {{balance}}"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Dispatching...' : 'Launch Broadcast Campaign'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
