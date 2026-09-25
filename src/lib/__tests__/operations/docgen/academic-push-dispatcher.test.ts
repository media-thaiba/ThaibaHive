import { AcademicPushDispatcher } from '../../../operations/docgen/mobile/academic-push-dispatcher';
import { ScheduleSyncEngine } from '../../../operations/docgen/mobile/schedule-sync-engine';
import { DocDbStore } from '../../../db/docgen-store';

describe('AcademicPushDispatcher & ScheduleSyncEngine (Sprint-056)', () => {
  beforeEach(() => {
    DocDbStore.getInstance().clearMemoryStore();
  });

  describe('AcademicPushDispatcher', () => {
    it('should dispatch teacher substitution alert and log delivered status', async () => {
      const dispatcher = AcademicPushDispatcher.getInstance();
      const result = await dispatcher.dispatchPush({
        institutionId: 'inst-001',
        eventType: 'substitution_assigned',
        title: 'Substitution Alert: Operating Systems',
        body: 'You have been assigned as substitute teacher for Period 2 in Room 204.',
        targetAudience: 'user',
        targetId: 'teacher-401',
        data: { slotId: 'slot-02', date: '2026-08-28' },
      });

      expect(result.syncEventId).toBeDefined();
      expect(result.deliveredCount).toBe(1);
      expect(result.logs[0].status).toBe('delivered');
      expect(result.logs[0].recipientUserId).toBe('teacher-401');
    });
  });

  describe('ScheduleSyncEngine', () => {
    it('should compute schedule delta payload for mobile client', async () => {
      const syncEngine = ScheduleSyncEngine.getInstance();
      const payload = await syncEngine.computeScheduleDelta('inst-001');

      expect(payload.institutionId).toBe('inst-001');
      expect(payload.hasDeltas).toBe(true);
      expect(payload.timetableDeltas.length).toBeGreaterThan(0);
      expect(payload.timetableDeltas[1].isSubstitution).toBe(true);
      expect(payload.activeExamNotifications).toBeDefined();
    });
  });
});
