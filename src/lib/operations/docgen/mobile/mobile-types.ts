import { MobileSyncEventType } from '../docgen-types';

export interface AcademicPushPayload {
  institutionId: string;
  eventType: MobileSyncEventType;
  title: string;
  body: string;
  targetAudience: 'teachers' | 'students' | 'guardians' | 'class' | 'user';
  targetId?: string;
  data?: Record<string, any>;
}

export interface PushDispatchResult {
  syncEventId: string;
  dispatchedCount: number;
  deliveredCount: number;
  failedCount: number;
  logs: Array<{ recipientUserId: string; status: 'delivered' | 'failed'; error?: string }>;
}

export interface TimetableSlotDelta {
  slotId: string;
  dayOfWeek: number;
  slotOrder: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherId?: string;
  teacherName?: string;
  roomNumber?: string;
  isSubstitution?: boolean;
  substituteTeacherName?: string;
  action: 'UPSERT' | 'DELETE';
}

export interface ScheduleSyncPayload {
  institutionId: string;
  serverTimestamp: string;
  syncVersion: number;
  hasDeltas: boolean;
  timetableDeltas: TimetableSlotDelta[];
  activeExamNotifications?: Array<{ examId: string; title: string; session: string }>;
}
