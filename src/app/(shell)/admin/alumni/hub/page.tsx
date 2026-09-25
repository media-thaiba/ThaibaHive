'use client';

import React from 'react';
import { useAlumniHub } from '@/lib/hooks/use-alumni-hub';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlumniDirectoryTab } from '@/components/operations/alumni/alumni-directory-tab';
import { MentorshipMeshTab } from '@/components/operations/alumni/mentorship-mesh-tab';
import { JobPlacementTab } from '@/components/operations/alumni/job-placement-tab';
import { EndowmentCampaignTab } from '@/components/operations/alumni/endowment-campaign-tab';
import { ChapterEventsTab } from '@/components/operations/alumni/chapter-events-tab';

export default function AlumniHubPage() {
  const { profiles, jobs, campaigns, chapters, events, loading, error, refresh } = useAlumniHub();

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ALUMNI-HUB & EndowmentOS Central Cockpit
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Multi-campus verified alumni network, AI career mentorship mesh, institutional job board & Section 80G endowment fund management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refresh()}>
            Refresh Live Network
          </Button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Tabs defaultValue="directory" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="directory">Alumni Directory</TabsTrigger>
          <TabsTrigger value="mentorship">Mentorship Mesh</TabsTrigger>
          <TabsTrigger value="jobs">Job Placement</TabsTrigger>
          <TabsTrigger value="endowments">Endowment Funds</TabsTrigger>
          <TabsTrigger value="chapters">Chapters & Events</TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <AlumniDirectoryTab profiles={profiles} onRefresh={refresh} />
        </TabsContent>

        <TabsContent value="mentorship">
          <MentorshipMeshTab onRefresh={refresh} />
        </TabsContent>

        <TabsContent value="jobs">
          <JobPlacementTab jobs={jobs} onRefresh={refresh} />
        </TabsContent>

        <TabsContent value="endowments">
          <EndowmentCampaignTab campaigns={campaigns} onRefresh={refresh} />
        </TabsContent>

        <TabsContent value="chapters">
          <ChapterEventsTab chapters={chapters} events={events} onRefresh={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
