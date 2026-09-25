export interface ExamScheduleItemInput {
  date: string;
  time: string;
  subjectCode: string;
  subjectTitle: string;
  hallNumber?: string;
  seatNumber?: string;
}

export interface CandidateSeatingInfo {
  examCenterName: string;
  hallNumber: string;
  seatNumber: string;
  examSession: string;
  sortedSchedule: ExamScheduleItemInput[];
}

export class SeatingAllocationBridge {
  public static processSeating(
    examCenterName: string,
    hallNumber: string,
    seatNumber: string,
    examSession: string,
    schedule: ExamScheduleItemInput[]
  ): CandidateSeatingInfo {
    // Sort schedule chronologically
    const sorted = [...schedule].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return {
      examCenterName,
      hallNumber,
      seatNumber,
      examSession,
      sortedSchedule: sorted,
    };
  }
}
