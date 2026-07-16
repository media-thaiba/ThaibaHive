import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string | React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between animate-fade-in", className)}>
      <div>
        <h1 className="text-display">{title}</h1>
        {description && <div className="text-caption mt-1">{description}</div>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
