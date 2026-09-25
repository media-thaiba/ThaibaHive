'use client';

import React, { useState } from 'react';
import { MentorMatchResult } from '@/lib/operations/alumni/mentorship/mentorship-matching-engine';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface MentorDiscoveryCardProps {
  mentor: MentorMatchResult;
  onBookSuccess?: () => void;
}

export function MentorDiscoveryCard({ mentor, onBookSuccess }: MentorDiscoveryCardProps) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [goals, setGoals] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRequest = async () => {
    try {
      setSubmitting(true);
      await fetch('/api/alumni/mentorship/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          institutionId: 'global',
          mentorshipProfileId: mentor.mentorProfileId,
          studentId: 'std_me',
          requestTopic: topic || 'Career Guidance',
          requestGoals: goals || 'Industry readiness',
        }),
      });
      setOpen(false);
      if (onBookSuccess) onBookSuccess();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base font-semibold">{mentor.mentorName}</CardTitle>
              <p className="text-xs text-slate-500">
                {mentor.mentorDesignation} @ {mentor.mentorCompany || 'Enterprise'}
              </p>
            </div>
            <Badge variant="success">
              {Math.round(mentor.compatibilityScore * 100)}% Match
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <p className="text-xs text-slate-600 italic bg-teal-50/50 p-2 rounded border border-teal-100">
            {mentor.explanation}
          </p>
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Rating: ★ {mentor.averageRating.toFixed(1)} / 5.0</span>
            <span>Domain: {mentor.mentorIndustry}</span>
          </div>
          <Button className="w-full mt-2" size="sm" onClick={() => setOpen(true)}>
            Request Mentorship Session
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Mentorship with {mentor.mentorName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-slate-700">Discussion Topic</label>
              <Input
                placeholder="e.g. System Design Interview Prep"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Specific Goals</label>
              <Input
                placeholder="e.g. Portfolio review and advice for transition to full stack role"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequest} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
