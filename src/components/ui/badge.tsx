import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary hover:bg-primary/15",
        secondary: "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
        destructive: "border-transparent bg-destructive/10 text-destructive hover:bg-destructive/15",
        outline: "text-foreground border-border",
        success: "border-transparent bg-success/10 text-success hover:bg-success/15",
        warning: "border-transparent bg-warning/10 text-warning hover:bg-warning/15",
        info: "border-transparent bg-info/10 text-info hover:bg-info/15",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export const Badge = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
);
Badge.displayName = "Badge";
