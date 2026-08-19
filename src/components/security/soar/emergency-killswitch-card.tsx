'use client';

/**
 * SOAR Emergency Killswitch Component
 * Sprint-040 — Rapid Emergency Controls
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';

interface EmergencyKillswitchCardProps {
  engineEnabled: boolean;
  onToggle: (enabled: boolean) => Promise<boolean>;
}

export function EmergencyKillswitchCard({ engineEnabled, onToggle }: EmergencyKillswitchCardProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleToggle = async () => {
    setSubmitting(true);
    try {
      await onToggle(!engineEnabled);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className={engineEnabled ? 'border-border' : 'border-destructive bg-destructive/5'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">SOAR Automation Engine Status</CardTitle>
            <CardDescription className="text-sm mt-1">
              Autonomous security orchestration and playbook execution controls
            </CardDescription>
          </div>
          <Badge variant={engineEnabled ? 'success' : 'destructive'} className="text-sm px-3 py-1">
            {engineEnabled ? 'ACTIVE / AUTONOMOUS' : 'EMERGENCY PAUSE ENGAGED'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!engineEnabled && (
          <Alert variant="error">
            <div>
              <div className="font-semibold">Automation Disabled</div>
              <div className="text-xs">
                All autonomous playbook triggers are paused platform-wide. Threat indicators are logged only.
              </div>
            </div>
          </Alert>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            {engineEnabled
              ? 'Engage emergency killswitch to instantly halt all automated mitigations.'
              : 'Resume normal autonomous security orchestration operations across cluster.'}
          </span>
          <Button
            variant={engineEnabled ? 'destructive' : 'default'}
            disabled={submitting}
            onClick={handleToggle}
          >
            {submitting ? 'Updating...' : engineEnabled ? 'Engage Killswitch' : 'Resume Orchestrator'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
