import { AlumniTelemetryManager, AlumniTelemetryEvent } from '../../operations/alumni/telemetry/alumni-metrics';

describe('Alumni Telemetry Manager & OpenMetrics Stream (Sprint-058 - ALUM-014)', () => {
  let telemetry: AlumniTelemetryManager;

  beforeEach(() => {
    telemetry = AlumniTelemetryManager.getInstance();
    telemetry.metrics.activeAlumniTotal = 0;
    telemetry.metrics.mentorshipMatchesTotal = 0;
    telemetry.metrics.donationsTotalAmountCents = 0;
    telemetry.metrics.donationsCountTotal = 0;
  });

  it('should broadcast telemetry events to subscribers and update OpenMetrics state', (done) => {
    const instId = 'inst_campus_telemetry';
    let received = false;

    const unsubscribe = telemetry.subscribe((event: AlumniTelemetryEvent) => {
      if (event.type === 'donation_received') {
        expect(event.institutionId).toBe(instId);
        expect(event.data.amount).toBe(50000);
        received = true;
      }
    });

    telemetry.broadcastEvent('donation_received', instId, {
      amount: 50000,
      donor: 'Alumni Benefactor',
    });

    expect(received).toBe(true);
    expect(telemetry.metrics.donationsCountTotal).toBe(1);
    expect(telemetry.metrics.donationsTotalAmountCents).toBe(5000000);

    const prometheus = telemetry.getPrometheusMetrics();
    expect(prometheus).toContain('alumni_donations_cents_total 5000000');

    unsubscribe();
    done();
  });
});
