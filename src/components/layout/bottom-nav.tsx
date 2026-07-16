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
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-sm lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {primaryNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl transition-colors min-w-[44px] min-h-[44px]",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:bg-muted"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
