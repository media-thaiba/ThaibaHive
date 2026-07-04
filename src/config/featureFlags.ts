export const featureFlags = {
  attendance: true,
  dailyReports: true,
  taskManagement: true,
  leaveManagement: true,
  announcements: true,
  eventsCalendar: true,
  circulars: true,
  polls: true,
  bookings: false,
  helpDesk: false,
  staffRecognition: false,
} as const;

export type FeatureFlag = keyof typeof featureFlags;
