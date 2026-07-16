"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  ArrowLeft,
  Construction,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ComingSoonProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
};

export function ComingSoon({
  icon: Icon,
  title,
  description = "We're working hard to bring this feature to life. Stay tuned for something great!",
  className,
}: ComingSoonProps) {
  return (
    <div
      className={cn(
        "flex-1 flex items-center justify-center p-6",
        className,
      )}
    >
      <div className="relative flex flex-col items-center text-center max-w-md w-full">
        {/* Gradient background blob */}
        <div
          aria-hidden
          className="absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)",
          }}
        />

        {/* Icon container */}
        <div className="relative mb-6 flex items-center justify-center h-24 w-24 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 shadow-lg shadow-primary/5 animate-[scale-in_0.4s_ease-out]">
          <Icon className="h-11 w-11 text-primary" strokeWidth={1.5} />
          <div className="absolute -bottom-1.5 -right-1.5 flex items-center justify-center h-7 w-7 rounded-full bg-muted border shadow-sm">
            <Construction className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Badge */}
        <span className="relative z-10 mb-3 inline-flex items-center rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary tracking-wide uppercase">
          Under Development
        </span>

        {/* Title */}
        <h1 className="relative z-10 text-2xl font-bold tracking-tight mb-2">
          {title}
        </h1>

        {/* Description */}
        <p className="relative z-10 text-sm text-muted-foreground leading-relaxed mb-8">
          {description}
        </p>

        {/* CTA */}
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "gap-2",
          )}
          aria-label="Back to Dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
