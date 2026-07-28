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

const colorMap: Record<string, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
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
    <Link id={id} href={href} className="interactive-row block group p-5 border border-muted/50 rounded-xl bg-card hover:border-primary/10 shadow-xs">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{label}</p>
        <span className={`${colorMap[c]} opacity-60 group-hover:opacity-100 transition-opacity`}>{icon}</span>
      </div>
      <p className={`text-2xl font-extrabold tracking-tight ${colorMap[c]}`}>
        {value}
        {suffix && <span className="text-xs font-normal text-muted-foreground ml-1">{suffix}</span>}
      </p>
      {progress !== undefined && (
        <div className="mt-3 h-1 w-full rounded-full bg-muted/70 overflow-hidden">
          <div
            className={`h-full rounded-full ${barMap[c]} transition-all duration-700 ease-out`}
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>
      )}
    </Link>
  );
}
