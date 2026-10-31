import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, X, Info } from "lucide-react";

const alertVariants = {
  success: "bg-success/10 text-emerald-800 dark:text-emerald-300 border-success/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-info/10 text-sky-800 dark:text-sky-300 border-info/20",
  warning: "bg-warning/10 text-amber-800 dark:text-amber-300 border-warning/20",
};

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle,
};

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: keyof typeof alertVariants;
  onDismiss?: () => void;
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", onDismiss, children, ...props }, ref) => {
    const Icon = iconMap[variant];
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "flex items-start gap-3 rounded-xl border p-3.5 text-sm",
          alertVariants[variant],
          className
        )}
        {...props}
      >
        <Icon className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="flex-1">{children}</div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss alert"
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = "Alert";
