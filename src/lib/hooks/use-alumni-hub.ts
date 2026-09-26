'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlumniProfileItem,
  AlumniMentorshipProfileItem,
  AlumniJobPostingItem,
  AlumniDonationCampaignItem,
  AlumniChapterItem,
  AlumniEventItem,
} from '@/lib/operations/alumni/types';

export function useAlumniHub(institutionId: string = 'global') {
  const [profiles, setProfiles] = useState<AlumniProfileItem[]>([]);
  const [mentors, _setMentors] = useState<AlumniMentorshipProfileItem[]>([]);
  const [jobs, setJobs] = useState<AlumniJobPostingItem[]>([]);
  const [campaigns, setCampaigns] = useState<AlumniDonationCampaignItem[]>([]);
  const [chapters, setChapters] = useState<AlumniChapterItem[]>([]);
  const [events, setEvents] = useState<AlumniEventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHubData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [profRes, jobRes, campRes, chapRes, evtRes] = await Promise.all([
        fetch(`/api/alumni/profiles?institutionId=${institutionId}`).then((r) => r.json()).catch(() => ({ items: [] })),
        fetch(`/api/alumni/jobs?institutionId=${institutionId}`).then((r) => r.json()).catch(() => ({ jobs: [] })),
        fetch(`/api/alumni/endowments/campaigns?institutionId=${institutionId}`).then((r) => r.json()).catch(() => ({ campaigns: [] })),
        fetch(`/api/alumni/chapters?institutionId=${institutionId}`).then((r) => r.json()).catch(() => ({ chapters: [] })),
        fetch(`/api/alumni/events?institutionId=${institutionId}`).then((r) => r.json()).catch(() => ({ events: [] })),
      ]);

      setProfiles(profRes.items || []);
      setJobs(jobRes.jobs || []);
      setCampaigns(campRes.campaigns || []);
      setChapters(chapRes.chapters || []);
      setEvents(evtRes.events || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load alumni hub telemetry');
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    fetchHubData();
  }, [fetchHubData]);

  return {
    profiles,
    mentors,
    jobs,
    campaigns,
    chapters,
    events,
    loading,
    error,
    refresh: fetchHubData,
  };
}
