export type StaffRole = "super_admin" | "admin" | "hod" | "principal" | "staff" | "accounts" | "purchase";

export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "early_exit"
  | "half_day"
  | "on_leave";

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export type TaskStatus = "todo" | "in_progress" | "review" | "completed";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type ReportStatus = "draft" | "submitted" | "reviewed";

export type AnnouncementPriority = "low" | "normal" | "high" | "urgent";

export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type EventType =
  | "institution"
  | "department"
  | "holiday"
  | "meeting"
  | "other";

export type RsvpStatus = "pending" | "attending" | "declined" | "maybe";

export type RecognitionType =
  | "birthday"
  | "work_anniversary"
  | "achievement"
  | "custom";
