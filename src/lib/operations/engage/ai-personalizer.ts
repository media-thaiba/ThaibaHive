import { RecipientType } from './engage-types';

export interface RecipientProfileContext {
  recipientId: string;
  recipientType: RecipientType;
  name: string;
  department?: string;
  gpa?: number;
  attendancePct?: number;
  outstandingBalanceUsd?: number;
  preferredTone?: 'formal' | 'encouraging' | 'urgent' | 'concise';
}

export interface PersonalizedContentResult {
  personalizedSubject: string;
  personalizedBody: string;
  recommendedAction: string;
  toneApplied: string;
  personalizedVariables: Record<string, any>;
}

export class AiPersonalizer {
  private static instance: AiPersonalizer;

  public static getInstance(): AiPersonalizer {
    if (!AiPersonalizer.instance) {
      AiPersonalizer.instance = new AiPersonalizer();
    }
    return AiPersonalizer.instance;
  }

  public personalizeMessage(
    baseSubject: string,
    baseBody: string,
    profile: RecipientProfileContext
  ): PersonalizedContentResult {
    let toneApplied = profile.preferredTone || 'encouraging';
    const personalizedVariables: Record<string, any> = {
      name: profile.name,
      department: profile.department || 'General Studies',
      attendance: profile.attendancePct !== undefined ? `${profile.attendancePct.toFixed(1)}%` : 'N/A',
      gpa: profile.gpa !== undefined ? profile.gpa.toFixed(2) : 'N/A',
    };

    let subjectPrefix = '';
    let bodyAddendum = '';
    let recommendedAction = 'Review your portal dashboard for further details.';

    // Dynamic Tone and Contextual Synthesis
    if (profile.recipientType === 'parent') {
      toneApplied = 'formal';
      if (profile.attendancePct !== undefined && profile.attendancePct < 75) {
        subjectPrefix = '[Important Update] ';
        bodyAddendum = `\n\nNotice: ${profile.name}'s attendance is currently at ${profile.attendancePct}%. We encourage scheduling a brief check-in with the department counselor.`;
        recommendedAction = 'Click here to schedule a 10-minute counselor consultation.';
      } else if (profile.gpa !== undefined && profile.gpa >= 3.8) {
        bodyAddendum = `\n\nCommendation: ${profile.name} is currently maintaining honors standing (GPA: ${profile.gpa}). Keep up the outstanding dedication!`;
      }
    } else if (profile.recipientType === 'student') {
      if (profile.attendancePct !== undefined && profile.attendancePct < 75) {
        toneApplied = 'encouraging';
        bodyAddendum = `\n\nTip: You need just 3 more consecutive sessions to restore your attendance above the 80% mark.`;
        recommendedAction = 'Review your upcoming schedule and attendance recovery assignments.';
      }
    }

    if (profile.outstandingBalanceUsd && profile.outstandingBalanceUsd > 0) {
      personalizedVariables.balance = `$${profile.outstandingBalanceUsd.toFixed(2)}`;
      if (profile.recipientType === 'parent') {
        bodyAddendum += `\n\nTuition Note: An outstanding balance of $${profile.outstandingBalanceUsd.toFixed(2)} is pending. Flexible installment options are available online.`;
      }
    }

    const personalizedSubject = `${subjectPrefix}${baseSubject}`.trim();
    const personalizedBody = `${baseBody}${bodyAddendum}`.trim();

    return {
      personalizedSubject,
      personalizedBody,
      recommendedAction,
      toneApplied,
      personalizedVariables,
    };
  }
}
