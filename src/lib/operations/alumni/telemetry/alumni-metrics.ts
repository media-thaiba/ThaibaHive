export interface AlumniTelemetryEvent {
  id: string;
  type:
    | 'alumni_profile_created'
    | 'mentorship_matched'
    | 'session_completed'
    | 'job_posted'
    | 'application_submitted'
    | 'donation_received'
    | 'event_rsvp_registered'
    | 'event_checked_in';
  timestamp: string;
  institutionId: string;
  data: Record<string, any>;
}

export class AlumniTelemetryManager {
  private static instance: AlumniTelemetryManager;
  private listeners: Array<(event: AlumniTelemetryEvent) => void> = [];

  // OpenMetrics state counters
  public metrics = {
    activeAlumniTotal: 0,
    mentorshipMatchesTotal: 0,
    mentorshipHoursDeliveredTotal: 0,
    jobsPostedTotal: 0,
    jobApplicationsTotal: 0,
    jobPlacementsTotal: 0,
    donationsTotalAmountCents: 0,
    donationsCountTotal: 0,
    activeChaptersTotal: 0,
    eventAttendeesTotal: 0,
  };

  public static getInstance(): AlumniTelemetryManager {
    if (!AlumniTelemetryManager.instance) {
      AlumniTelemetryManager.instance = new AlumniTelemetryManager();
    }
    return AlumniTelemetryManager.instance;
  }

  public subscribe(listener: (event: AlumniTelemetryEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public broadcastEvent(
    type: AlumniTelemetryEvent['type'],
    institutionId: string,
    data: Record<string, any>
  ): void {
    const event: AlumniTelemetryEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      timestamp: new Date().toISOString(),
      institutionId,
      data,
    };

    // Update internal metrics
    if (type === 'alumni_profile_created') {
      this.metrics.activeAlumniTotal++;
    } else if (type === 'mentorship_matched') {
      this.metrics.mentorshipMatchesTotal++;
    } else if (type === 'session_completed' && data.durationHours) {
      this.metrics.mentorshipHoursDeliveredTotal += Number(data.durationHours);
    } else if (type === 'job_posted') {
      this.metrics.jobsPostedTotal++;
    } else if (type === 'application_submitted') {
      this.metrics.jobApplicationsTotal++;
    } else if (type === 'donation_received' && data.amount) {
      this.metrics.donationsCountTotal++;
      this.metrics.donationsTotalAmountCents += Math.round(Number(data.amount) * 100);
    } else if (type === 'event_checked_in') {
      this.metrics.eventAttendeesTotal++;
    }

    this.listeners.forEach((l) => {
      try {
        l(event);
      } catch (err) {
        console.error('Alumni telemetry listener dispatch error:', err);
      }
    });
  }

  public getPrometheusMetrics(): string {
    return [
      '# HELP alumni_active_total Total count of active alumni profiles',
      '# TYPE alumni_active_total counter',
      `alumni_active_total ${this.metrics.activeAlumniTotal}`,
      '# HELP alumni_mentorship_matches_total Total mentorship matches computed',
      '# TYPE alumni_mentorship_matches_total counter',
      `alumni_mentorship_matches_total ${this.metrics.mentorshipMatchesTotal}`,
      '# HELP alumni_mentorship_hours_total Total hours of mentorship delivered',
      '# TYPE alumni_mentorship_hours_total counter',
      `alumni_mentorship_hours_total ${this.metrics.mentorshipHoursDeliveredTotal}`,
      '# HELP alumni_jobs_posted_total Total jobs posted by alumni and recruiters',
      '# TYPE alumni_jobs_posted_total counter',
      `alumni_jobs_posted_total ${this.metrics.jobsPostedTotal}`,
      '# HELP alumni_donations_cents_total Total endowment donations received in cents',
      '# TYPE alumni_donations_cents_total counter',
      `alumni_donations_cents_total ${this.metrics.donationsTotalAmountCents}`,
      '# HELP alumni_event_attendees_total Total event attendees checked in via QR passes',
      '# TYPE alumni_event_attendees_total counter',
      `alumni_event_attendees_total ${this.metrics.eventAttendeesTotal}`,
    ].join('\n');
  }
}

export const alumniTelemetryManager = AlumniTelemetryManager.getInstance();
