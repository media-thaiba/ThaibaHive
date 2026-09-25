'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlumniJobPostingItem,
  AlumniDonationCampaignItem,
  AlumniEventItem,
} from '@/lib/operations/alumni/types';
import { MentorMatchResult } from '@/lib/operations/alumni/mentorship/mentorship-matching-engine';

export function useAlumniPortal(studentId: string = 'std_me', institutionId: string = 'global') {
  const [recommendedMentors, setRecommendedMentors] = useState<MentorMatchResult[]>([]);
  const [jobs, setJobs] = useState<AlumniJobPostingItem[]>([]);
  const [campaigns, setCampaigns] = useState<AlumniDonationCampaignItem[]>([]);
  const [events, setEvents] = useState<AlumniEventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortalData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [jobsRes, campsRes, evtsRes] = await Promise.all([
        fetch(`/api/alumni/jobs?institutionId=${institutionId}`).then((r) => r.json()).catch(() => ({ jobs: [] })),
        fetch(`/api/alumni/endowments/campaigns?institutionId=${institutionId}`).then((r) => r.json()).catch(() => ({ campaigns: [] })),
        fetch(`/api/alumni/events?institutionId=${institutionId}`).then((r) => r.json()).catch(() => ({ events: [] })),
      ]);

      setJobs(jobsRes.jobs || []);
      setCampaigns(campsRes.campaigns || []);
      setEvents(evtsRes.events || []);

      // Mock student profile recommendation fetch
      const matchRes = await fetch(`/api/alumni/mentorship/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          institutionId,
          department: 'Computer Science',
          degreeProgram: 'B.Tech CS',
          targetRole: 'Software Engineer',
          targetIndustry: 'Technology',
          desiredSkills: ['TypeScript', 'React', 'Cloud'],
        }),
      }).then((r) => r.json()).catch(() => ({ matches: [] }));

      setRecommendedMentors(matchRes.matches || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load alumni portal data');
    } finally {
      setLoading(false);
    }
  }, [studentId, institutionId]);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  return {
    recommendedMentors,
    jobs,
    campaigns,
    events,
    loading,
    error,
    refresh: fetchPortalData,
  };
}
