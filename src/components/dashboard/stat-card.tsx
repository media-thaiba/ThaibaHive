import Link from "next/link";

type StatCardProps = {
  id?: string;
  label: string;
  value: number;
  suffix?: string;
  progress?: number;
  href: string;
  icon: React.ReactNode;
  color?: "primary" | "success" | "warning" | "info" | "destructive" | "muted";
};

const barMap: Record<string, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground",
};

const iconMap: Record<string, string> = {
  primary: "bg-primary/10 border-primary/20 text-primary group-hover:bg-primary/15",
  success: "bg-success/10 border-success/20 text-success group-hover:bg-success/15",
  warning: "bg-warning/10 border-warning/20 text-warning group-hover:bg-warning/15",
  info: "bg-info/10 border-info/20 text-info group-hover:bg-info/15",
  destructive: "bg-destructive/10 border-destructive/20 text-destructive group-hover:bg-destructive/15",
  muted: "bg-muted border-border text-muted-foreground group-hover:bg-muted/80",
};

export function StatCard({ id, label, value, suffix, progress, href, icon, color }: StatCardProps) {
  const c = color || "primary";
  return (
    <Link
      id={id}
      href={href}
      className="interactive-row block group p-5 border border-border/70 rounded-xl bg-card/80 backdrop-blur-md hover:border-border transition-all duration-150 active:scale-[0.99] dark:border-white/10 dark:bg-card/50 dark:hover:border-white/20 shadow-xs hover:shadow-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={`p-2 rounded-lg border transition-transform duration-150 group-hover:scale-105 ${iconMap[c]}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground group-hover:text-primary transition-colors">
        {value}
        {suffix && <span className="text-xs font-normal text-muted-foreground ml-1.5">{suffix}</span>}
      </p>
      {progress !== undefined && (
        <div className="mt-3.5 h-1.5 w-full rounded-full bg-muted/60 dark:bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full ${barMap[c]} transition-all duration-700 ease-out`}
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>
      )}
    </Link>
  );
}
