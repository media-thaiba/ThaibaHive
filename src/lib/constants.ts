export type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";

export const statusBadgeVariants: Record<string, BadgeVariant> = {
  pending: "warning",
  pending_hod: "warning",
  pending_accounts: "warning",
  pending_purchase: "warning",
  approved: "success",
  resolved: "success",
  closed: "success",
  completed: "success",
  present: "success",
  attending: "success",
  available: "success",
  active: "success",
  checked_in: "info",
  in_progress: "info",
  open: "info",
  submitted: "info",
  rejected: "destructive",
  absent: "destructive",
  declined: "destructive",
  cancelled: "destructive",
  expired: "destructive",
  on_leave: "warning",
  late: "warning",
  maybe: "secondary",
  draft: "secondary",
  available_status: "secondary",
};

export const priorityBadgeVariants: Record<string, BadgeVariant> = {
  urgent: "destructive",
  high: "warning",
  normal: "secondary",
  medium: "info",
  low: "info",
};
