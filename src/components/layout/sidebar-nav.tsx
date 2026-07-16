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
        "hidden lg:flex flex-col border-r bg-card h-[calc(100vh-3.5rem)] sticky top-14 transition-all duration-200",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        {!collapsed && (
          <button
            onClick={onSearchOpen}
            className="flex-1 flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors text-left"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search...</span>
            <kbd className="ml-auto text-[10px] font-mono bg-background border rounded px-1 py-0.5">
              ⌘K
            </kbd>
          </button>
        )}
        {collapsed && (
          <button
            onClick={onSearchOpen}
            className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"
          >
            <Search className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {navGroups.map((group) => {
          const isExpanded = expandedGroups.includes(group.label);
          return (
            <div key={group.label}>
              <button
                onClick={() => !collapsed && toggleGroup(group.label)}
                className={cn(
                  "flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors",
                  collapsed && "justify-center"
                )}
              >
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{group.label}</span>
                    <ChevronRight
                      className={cn(
                        "h-3 w-3 transition-transform duration-150",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </>
                )}
                {collapsed && (
                  <span className="text-[10px] uppercase tracking-wider">
                    {group.label.slice(0, 2)}
                  </span>
                )}
              </button>
              {(isExpanded || collapsed) && (
                <div className={cn("space-y-0.5", collapsed && "space-y-1")}>
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

      <div className="border-t p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"
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
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors group w-full text-left",
          "text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground cursor-default",
          collapsed && "justify-center px-2"
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="truncate">{item.label}</span>
            <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground/70">
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
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors group",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        collapsed && "justify-center px-2"
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}
