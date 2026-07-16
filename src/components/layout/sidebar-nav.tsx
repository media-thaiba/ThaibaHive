"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups, isPhaseOnePath, type NavItem } from "@/config/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SidebarNavProps = {
  onSearchOpen: () => void;
};

export function SidebarNav({ onSearchOpen }: SidebarNavProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    navGroups.map((g) => g.label)
  );

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  function toggleGroup(label: string) {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  }

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r bg-card h-[calc(100vh-3.5rem)] sticky top-14 transition-all duration-300 ease-out",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-3 border-b">
        {!collapsed ? (
          <button
            onClick={onSearchOpen}
            className="flex-1 flex items-center gap-2.5 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150 text-left"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1">Search...</span>
            <kbd className="text-[10px] font-mono bg-background border rounded px-1.5 py-0.5 text-muted-foreground/70">
              Ctrl K
            </kbd>
          </button>
        ) : (
          <button
            onClick={onSearchOpen}
            className="flex items-center justify-center w-full rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
          >
            <Search className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
        {navGroups.map((group) => {
          const isExpanded = expandedGroups.includes(group.label);
          return (
            <div key={group.label}>
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center gap-2 w-full rounded-lg px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground transition-colors duration-150"
                >
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      isExpanded && "rotate-90"
                    )}
                  />
                </button>
              )}
              {(isExpanded || collapsed) && (
                <div className={cn("space-y-0.5 mt-0.5", collapsed && "space-y-1")}>
                  {group.items.map((item) => (
                    <SidebarLink
                      key={item.href}
                      item={item}
                      active={isActive(item.href)}
                      collapsed={collapsed}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const enabled = isPhaseOnePath(item.href);
  const Icon = item.icon;

  if (!enabled) {
    return (
      <button
        onClick={() =>
          toast.info("Coming Soon", {
            description: "This feature will be available in a future update.",
          })
        }
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-150 group w-full text-left",
          "text-muted-foreground/40 hover:bg-muted/50 hover:text-muted-foreground cursor-default",
          collapsed && "justify-center px-2"
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="truncate flex-1">{item.label}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider rounded-full bg-muted/80 px-1.5 py-0.5 text-muted-foreground/50">
              Soon
            </span>
          </>
        )}
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-150 group relative",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        collapsed && "justify-center px-2"
      )}
      title={collapsed ? item.label : undefined}
    >
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-primary" />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}
