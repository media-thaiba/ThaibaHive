import { cn } from "@/lib/utils";

type PresenceDotProps = {
  online: boolean;
  status?: string;
  className?: string;
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500",
  busy: "bg-amber-500",
  meeting: "bg-amber-500",
  away: "bg-gray-400",
};

export function PresenceDot({ online, status = "active", className }: PresenceDotProps) {
  if (!online) {
    return (
      <span
        className={cn(
          "inline-block h-2.5 w-2.5 rounded-full bg-gray-300 border border-background",
          className
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full border border-background",
        STATUS_COLORS[status] ?? "bg-green-500",
        className
      )}
    />
  );
}
