import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium transition-colors tabular-nums",
  {
    variants: {
      variant: {
        default: "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 dark:border-primary/30 dark:bg-primary/15",
        secondary: "border-border/60 bg-muted/80 text-muted-foreground hover:bg-muted dark:border-border/40 dark:bg-muted/50",
        destructive: "border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive/15 dark:border-destructive/30 dark:bg-destructive/15 dark:text-rose-400",
        outline: "text-foreground border-border/80 dark:border-border/60",
        success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-400 hover:bg-emerald-500/15",
        warning: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-400 hover:bg-amber-500/15",
        info: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:border-sky-400/30 dark:bg-sky-400/15 dark:text-sky-400 hover:bg-sky-500/15",
      },
      size: {
        default: "text-[0.6875rem] uppercase tracking-wider",
        dense: "text-[10px] uppercase tracking-normal",
        sm: "text-[0.625rem] px-2 py-0.2 uppercase tracking-wide",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export const Badge = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>>(
  ({ className, variant, size, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
);
Badge.displayName = "Badge";
