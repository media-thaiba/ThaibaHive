export interface PerformanceReminderOptions {
  staffId: string;
  staffName: string;
  cycleTitle: string;
  dueDate: string;
  reminderType: "self_assessment" | "manager_review" | "final_signoff";
}

export class PerformanceNotificationService {
  static buildReminderPayload(options: PerformanceReminderOptions) {
    const { staffName, cycleTitle, dueDate, reminderType } = options;

    let title = "Performance Review Reminder";
    let body = `Hello ${staffName}, please complete your task for ${cycleTitle} by ${dueDate}.`;

    if (reminderType === "self_assessment") {
      title = `Self-Assessment Due: ${cycleTitle}`;
      body = `Hello ${staffName}, your self-assessment for ${cycleTitle} is due on ${dueDate}.`;
    } else if (reminderType === "manager_review") {
      title = `Subordinate Review Pending: ${cycleTitle}`;
      body = `Hello ${staffName}, manager evaluations for your team members are due on ${dueDate}.`;
    } else if (reminderType === "final_signoff") {
      title = `Performance Appraisal Completed`;
      body = `Hello ${staffName}, your performance appraisal for ${cycleTitle} is ready for review and sign-off.`;
    }

    return {
      title,
      body,
      data: {
        cycleTitle,
        dueDate,
        reminderType,
      },
    };
  }
}
