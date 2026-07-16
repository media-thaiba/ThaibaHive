import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, X, Info } from "lucide-react";

const alertVariants = {
  success: "bg-success/10 text-success border-success/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-info/10 text-info border-info/20",
  warning: "bg-warning/10 text-warning border-warning/20",
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
          "flex items-start gap-3 rounded-lg border p-3 text-sm",
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
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = "Alert";
