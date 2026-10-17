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

export function StatCard({ id, label, value, suffix, progress, href, icon, color }: StatCardProps) {
  const c = color || "primary";
  return (
    <Link
      id={id}
      href={href}
      className="interactive-row block group p-5 border border-border/70 rounded-xl bg-card/80 backdrop-blur-md hover:border-primary/40 dark:border-border/40 dark:bg-card/60 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] dark:hover:border-primary/50 dark:hover:shadow-[0_6px_28px_-6px_rgba(16,185,129,0.2),inset_0_1px_0_0_rgba(255,255,255,0.08)] shadow-xs hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary group-hover:scale-105 group-hover:bg-primary/15 transition-all duration-200">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
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
