'use client';

import React, { useState } from 'react';
import { AlumniJobPostingItem } from '@/lib/operations/alumni/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface JobApplicationModalProps {
  job: AlumniJobPostingItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitSuccess?: () => void;
}

export function JobApplicationModal({ job, open, onOpenChange, onSubmitSuccess }: JobApplicationModalProps) {
  const [resumeUrl, setResumeUrl] = useState('https://cdn.thaiba.edu/resumes/my_resume.pdf');
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!job) return null;

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await fetch('/api/alumni/jobs/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobPostingId: job.id,
          studentId: 'std_me',
          resumeUrl,
          coverLetter,
        }),
      });
      onOpenChange(false);
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply for {job.title} at {job.company}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-slate-700">Digital Resume URL / File Link</label>
            <Input
              value={resumeUrl}
              onChange={(e) => setResumeUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Cover Letter & Referral Notes</label>
            <Input
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Briefly explain your qualifications and alignment..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting Application...' : 'Submit Application'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
