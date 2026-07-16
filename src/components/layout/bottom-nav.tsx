"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNav } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[var(--z-sticky)] border-t bg-card/90 backdrop-blur-xl supports-[backdrop-filter]:bg-card/70 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {primaryNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-xl transition-all duration-200 min-w-[44px] min-h-[44px] relative",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:bg-muted/60"
              )}
            >
              {active && (
                <span className="absolute top-1.5 left-1/2 -translate-x-1/2 h-1 w-5 rounded-full bg-primary animate-scale-in" />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 transition-all duration-200",
                  active ? "stroke-[2.2]" : "stroke-[1.8]"
                )}
              />
              <span className={cn(
                "text-[10px] font-medium leading-tight transition-colors duration-200",
                active ? "text-primary" : ""
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
