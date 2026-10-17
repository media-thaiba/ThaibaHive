import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-lg border border-border/80 bg-background/60 backdrop-blur-sm px-3 py-1 text-sm shadow-xs",
      "transition-all duration-150",
      "dark:bg-card/40 dark:border-border/60 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]",
      "file:border-0 file:bg-transparent file:text-sm file:font-medium",
      "placeholder:text-muted-foreground/60",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/50",
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
