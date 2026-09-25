'use client';

import React, { useState } from 'react';
import { useAlumniPortal } from '@/lib/hooks/use-alumni-portal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { MentorDiscoveryCard } from '@/components/operations/alumni/mentor-discovery-card';
import { JobApplicationModal } from '@/components/operations/alumni/job-application-modal';
import { DonationCheckoutCard } from '@/components/operations/alumni/donation-checkout-card';
import { EventRsvpCard } from '@/components/operations/alumni/event-rsvp-card';
import { AlumniJobPostingItem } from '@/lib/operations/alumni/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AlumniPortalPage() {
  const { recommendedMentors, jobs, campaigns, events, loading, error, refresh } = useAlumniPortal();
  const [selectedJob, setSelectedJob] = useState<AlumniJobPostingItem | null>(null);
  const [jobModalOpen, setJobModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Alumni & Career Advancement Portal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Connect with verified alumni mentors, explore alumni-referred career opportunities, and support endowment funds
          </p>
        </div>
        <Button variant="outline" onClick={() => refresh()}>
          Refresh Portal
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Tabs defaultValue="mentors" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="mentors">AI Mentor Match</TabsTrigger>
          <TabsTrigger value="jobs">Job Board</TabsTrigger>
          <TabsTrigger value="endowments">Endowments</TabsTrigger>
          <TabsTrigger value="events">Homecoming & Events</TabsTrigger>
        </TabsList>

        <TabsContent value="mentors" className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Personalized AI Mentor Matches
            </h3>
            <p className="text-xs text-slate-500">
              Top alumni mentors matched to your department, career goals, and skill aspirations.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedMentors.map((mentor) => (
              <MentorDiscoveryCard key={mentor.mentorProfileId} mentor={mentor} onBookSuccess={refresh} />
            ))}
          </div>
          {recommendedMentors.length === 0 && (
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No matching mentors currently available in your domain.
            </div>
          )}
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Alumni-Referred Careers & Placements
            </h3>
            <p className="text-xs text-slate-500">
              Fast-track opportunities posted directly by alumni and vetted employer partners.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">{job.title}</CardTitle>
                      <p className="text-xs text-slate-500 font-medium">{job.company} • {job.location}</p>
                    </div>
                    {job.hasAlumniReferral && <Badge variant="success">Alumni Referral</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <p className="text-xs text-slate-600 line-clamp-2">{job.description}</p>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="capitalize">{job.roleType.replace('_', ' ')} • {job.workplaceType}</span>
                    <span className="font-semibold text-slate-800">
                      {job.salaryCurrency} {((job.minSalary || 0) / 100000).toFixed(1)}L - {((job.maxSalary || 0) / 100000).toFixed(1)}L
                    </span>
                  </div>
                  <Button
                    className="w-full mt-2"
                    size="sm"
                    onClick={() => {
                      setSelectedJob(job);
                      setJobModalOpen(true);
                    }}
                  >
                    Apply with 1-Click
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {jobs.length === 0 && (
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No active job openings at the moment.
            </div>
          )}
        </TabsContent>

        <TabsContent value="endowments" className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Active Institutional Endowment Funds
            </h3>
            <p className="text-xs text-slate-500">
              Contribute to scholarships, infrastructure, and research chairs with instant Section 80G tax receipts.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((camp) => (
              <DonationCheckoutCard key={camp.id} campaign={camp} onDonationSuccess={refresh} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Upcoming Alumni Events & Reunions
            </h3>
            <p className="text-xs text-slate-500">
              Reserve tickets and passes for global chapters and campus gatherings.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((evt) => (
              <EventRsvpCard key={evt.id} event={evt} onRsvpSuccess={refresh} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <JobApplicationModal
        job={selectedJob}
        open={jobModalOpen}
        onOpenChange={setJobModalOpen}
        onSubmitSuccess={refresh}
      />
    </div>
  );
}
