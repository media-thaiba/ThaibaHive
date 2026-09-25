'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureArray } from '@/lib/utils';

interface AdvisingHubTabProps {
  sessions?: any[];
  onOpenChat?: (sessionId: string) => void;
  loading?: boolean;
}

export const AdvisingHubTab: React.FC<AdvisingHubTabProps> = ({
  sessions = [],
  onOpenChat,
  loading = false,
}) => {
  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const safeSessions = ensureArray(sessions);

  const getDomainBadge = (domain: string) => {
    switch (domain) {
      case 'academic_recovery': return <Badge variant="destructive">Academic Recovery</Badge>;
      case 'career_alignment': return <Badge variant="info">Career Alignment</Badge>;
      case 'transfer_articulation': return <Badge variant="warning">Transfer Articulation</Badge>;
      case 'financial_aid_load': return <Badge variant="secondary">Financial Aid</Badge>;
      default: return <Badge variant="default">Degree Planner</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Active AI & Human Advising Sessions</span>
            <Badge variant="outline">{safeSessions.length} Active</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {safeSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No active advising sessions in the current window.
            </p>
          ) : (
            <div className="divide-y text-sm">
              {safeSessions.map((sess: any) => (
                <div key={sess.sessionId} className="py-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">Student: {sess.studentId}</span>
                      {getDomainBadge(sess.activeDomain)}
                      <Badge variant={sess.status === 'active' ? 'success' : 'secondary'}>
                        {sess.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Started: {new Date(sess.startedAt).toLocaleTimeString()} · Confidence: {Math.round((sess.confidenceScore || 0.9) * 100)}%
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenChat && onOpenChat(sess.sessionId)}
                  >
                    Inspect Dialogue
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
