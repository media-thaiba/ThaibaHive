'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useEngageDispatch } from '@/lib/hooks/engage/use-engage-dispatch';

export function DispatchRadarPanel() {
  const { messages, loading, error } = useEngageDispatch();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-destructive">
          Error loading dispatch radar: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Omnichannel Live Dispatch Radar</span>
            <Badge variant="info">Live Feed</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Total Outbound</p>
              <p className="text-2xl font-bold">{messages.length}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Channels Active</p>
              <p className="text-2xl font-bold">5</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Delivery Success Rate</p>
              <p className="text-2xl font-bold text-emerald-600">99.4%</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Avg Latency</p>
              <p className="text-2xl font-bold">14ms</p>
            </div>
          </div>

          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground font-medium border-b">
                <tr>
                  <th className="p-3">Message ID</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Recipient</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No active dispatches in queue.
                    </td>
                  </tr>
                ) : (
                  messages.map((msg: any) => (
                    <tr key={msg.messageId || msg.id} className="hover:bg-muted/50">
                      <td className="p-3 font-mono text-xs">{msg.messageId}</td>
                      <td className="p-3 uppercase font-medium">{msg.channel}</td>
                      <td className="p-3">{msg.recipientChannelAddress || msg.recipientId}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            msg.priority === 'critical'
                              ? 'destructive'
                              : msg.priority === 'high'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {msg.priority}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            msg.status === 'delivered' || msg.status === 'sent'
                              ? 'success'
                              : msg.status === 'failed'
                              ? 'destructive'
                              : 'info'
                          }
                        >
                          {msg.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
