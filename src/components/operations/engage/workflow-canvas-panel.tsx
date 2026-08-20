'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useEngageWorkflows } from '@/lib/hooks/engage/use-engage-workflows';

export function WorkflowCanvasPanel() {
  const { workflows, loading, error, createWorkflow } = useEngageWorkflows();
  const [name, setName] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('student.attendance.deficit');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);

    try {
      await createWorkflow({
        workflowId: `wf_${Date.now()}`,
        name,
        triggerEvent,
        steps: [
          {
            stepIndex: 0,
            type: 'send_message',
            name: 'Initial Notice',
            config: { channel: 'email', priority: 'high', bodyTemplate: 'Automated notice for {{name}}.' },
          },
          {
            stepIndex: 1,
            type: 'delay',
            name: 'Wait 2 Days',
            config: { delayDurationMinutes: 2880 },
          },
          {
            stepIndex: 2,
            type: 'send_message',
            name: 'Follow-up SMS',
            config: { channel: 'sms', priority: 'high', bodyTemplate: 'Urgent follow-up for {{name}}.' },
          },
        ],
        isActive: true,
      });
      setName('');
    } catch (err: any) {
      alert(err.message || 'Failed to create workflow');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Visual Engagement Workflow Canvas</span>
            <Badge variant="info">Event-Driven Engine</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="p-4 bg-muted/40 rounded-lg border mb-6 flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Workflow Title</label>
              <Input
                placeholder="e.g. Attendance Intervention Sequence"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="w-64">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Trigger Event</label>
              <Input
                value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : '+ Add Workflow'}
            </Button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workflows.length === 0 ? (
              <div className="col-span-2 text-center p-8 text-muted-foreground border rounded-lg">
                No automated workflows configured. Create your first sequence above.
              </div>
            ) : (
              workflows.map((wf: any) => (
                <div key={wf.workflowId || wf.id} className="p-4 border rounded-lg bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-base">{wf.name}</span>
                    <Badge variant={wf.isActive ? 'success' : 'secondary'}>
                      {wf.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground bg-muted p-2 rounded">
                    Trigger: {wf.triggerEvent}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Multi-Step Drip (Email &rarr; Delay &rarr; SMS)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
