import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { variant: "success" | "warning" | "destructive" | "info" | "secondary"; label: string }> = {
  available: { variant: "secondary", label: "Available" },
  assigned: { variant: "success", label: "Assigned" },
  lost: { variant: "destructive", label: "Lost" },
  damaged: { variant: "warning", label: "Damaged" },
  retired: { variant: "info", label: "Retired" },
};

export function NfcCardStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { variant: "secondary" as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
