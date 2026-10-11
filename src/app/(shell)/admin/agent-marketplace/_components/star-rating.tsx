import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type StarRatingProps = {
  value: number;
  count?: number;
  className?: string;
};

export function StarRating({ value, count, className }: StarRatingProps) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs", className)}
      aria-label={`Rated ${value.toFixed(1)} out of 5${count ? ` from ${count} reviews` : ""}`}
    >
      <span className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((step) => {
          const filled = rounded >= step;
          const half = !filled && rounded >= step - 0.5;
          return (
            <span key={step} className="relative inline-flex h-3 w-3">
              <Star className="absolute inset-0 h-3 w-3 text-muted-foreground/40" />
              {(filled || half) && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: half ? "50%" : "100%" }}>
                  <Star className="h-3 w-3 fill-warning text-warning" />
                </span>
              )}
            </span>
          );
        })}
      </span>
      <span className="text-muted-foreground tabular-nums">
        {value.toFixed(1)}
        {typeof count === "number" ? ` (${count})` : ""}
      </span>
    </span>
  );
}
