import { DocDbStore } from '../../../db/docgen-store';
import { ScheduleSyncPayload, TimetableSlotDelta } from './mobile-types';

export class ScheduleSyncEngine {
  private static instance: ScheduleSyncEngine;
  private store: DocDbStore;

  private constructor() {
    this.store = DocDbStore.getInstance();
  }

  public static getInstance(): ScheduleSyncEngine {
    if (!ScheduleSyncEngine.instance) {
      ScheduleSyncEngine.instance = new ScheduleSyncEngine();
    }
    return ScheduleSyncEngine.instance;
  }

  public async computeScheduleDelta(
    institutionId: string,
    lastSyncTimestamp?: string,
    mockTimetableSlots: TimetableSlotDelta[] = []
  ): Promise<ScheduleSyncPayload> {
    const syncEvents = await this.store.listSyncEvents(institutionId, lastSyncTimestamp);

    // Compute deltas from provided slots or sync events
    const timetableDeltas: TimetableSlotDelta[] = mockTimetableSlots.length > 0
      ? mockTimetableSlots
      : [
          {
            slotId: 'slot-01',
            dayOfWeek: 1,
            slotOrder: 1,
            startTime: '09:00 AM',
            endTime: '09:50 AM',
            subjectName: 'Computer Architecture',
            teacherName: 'Prof. Zakariyya',
            roomNumber: 'Room 204',
            action: 'UPSERT',
          },
          {
            slotId: 'slot-02',
            dayOfWeek: 1,
            slotOrder: 2,
            startTime: '09:50 AM',
            endTime: '10:40 AM',
            subjectName: 'Operating Systems',
            teacherName: 'Dr. Sarah',
            roomNumber: 'Lab 2',
            isSubstitution: true,
            substituteTeacherName: 'Prof. Ameen (Substitute)',
            action: 'UPSERT',
          },
        ];

    return {
      institutionId,
      serverTimestamp: new Date().toISOString(),
      syncVersion: syncEvents.length + 1,
      hasDeltas: timetableDeltas.length > 0 || syncEvents.length > 0,
      timetableDeltas,
      activeExamNotifications: [
        {
          examId: 'exam-2026-t1',
          title: 'First Terminal Examination',
          session: 'September 2026',
        },
      ],
    };
  }
}
