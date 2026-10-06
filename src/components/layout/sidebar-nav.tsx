"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useUIStore } from "@/stores";
import { PermissionGate } from "@/components/ui/permission-gate";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { workspaces, type WorkspaceConfig, type WorkspaceId, type NavItem, getItemsForWorkspace } from "@/config/navigation";

type SidebarNavProps = {
  onSearchOpen: () => void;
};

export function SidebarNav({ onSearchOpen }: SidebarNavProps) {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const { currentWorkspace, availableWorkspaces, setWorkspace } = useWorkspace();

  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(`sidebar_expanded_${currentWorkspace.id}`);
        return stored ? JSON.parse(stored) : currentWorkspace.id === "my-work" ? [workspaces.find(w => w.id === "my-work")?.label ?? ""] : [];
      }
      return currentWorkspace.id === "my-work" ? [workspaces.find(w => w.id === "my-work")?.label ?? ""] : [];
    }
  );

  // Get items for current workspace
  const workspaceItems = useMemo(() => getItemsForWorkspace(currentWorkspace.id), [currentWorkspace.id]);
  const workspaceGroup = useMemo(() => ({
    label: currentWorkspace.label,
    items: workspaceItems,
  }), [currentWorkspace.label, workspaceItems]);

  // Determine active state
  function isActive(href: string) {
    return href === "/my-work" ? pathname === "/my-work" : pathname.startsWith(href);
  }

  function toggleGroup(label: string) {
    setExpandedGroups((prev) => {
      const next = prev.includes(label)
        ? prev.filter((g) => g !== label)
        : [...prev, label];
      if (typeof window !== "undefined") {
        localStorage.setItem(`sidebar_expanded_${currentWorkspace.id}`, JSON.stringify(next));
      }
      return next;
    });
  }
  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r bg-card h-[calc(100vh-3.5rem)] sticky top-14 transition-all duration-300 ease-out",
        collapsed ? "w-[68px]" : "w-[280px]"
      )}
    >
      {/* Workspace Switcher Header */}
      {!collapsed && (
        <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/30">
          <WorkspaceTabs
            activeWorkspace={currentWorkspace}
            availableWorkspaces={availableWorkspaces}
            onSwitch={setWorkspace}
          />
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-3 border-b">
        {!collapsed ? (
          <button
            onClick={onSearchOpen}
            className="flex-1 flex items-center gap-2.5 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150 text-left"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1">Search {currentWorkspace.label}...</span>
            <kbd className="text-[10px] font-mono bg-background border rounded px-1.5 py-0.5 text-muted-foreground font-medium">
              Ctrl K
            </kbd>
          </button>
        ) : (
          <button
            onClick={onSearchOpen}
            className="flex items-center justify-center w-full rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1" aria-label={`${currentWorkspace.label} navigation`}>
        <div>
          <button
            onClick={() => toggleGroup(workspaceGroup.label)}
            aria-expanded={expandedGroups.includes(workspaceGroup.label) || collapsed}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors duration-150"
          >
            <span>{workspaceGroup.label}</span>
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform duration-200",
                (expandedGroups.includes(workspaceGroup.label) || collapsed) && "rotate-180"
              )}
            />
          </button>
          {(expandedGroups.includes(workspaceGroup.label) || collapsed) && (
            <div className={cn("space-y-0.5 mt-0.5", collapsed && "space-y-1")}>
              {workspaceGroup.items.map((item) => (
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
      </nav>

      {/* Workspace Switcher (Collapsed) */}
      {collapsed && (
        <div className="border-t p-2 space-y-1">
          {availableWorkspaces.map((w) => (
            <button
              key={w.id}
              onClick={() => setWorkspace(w.id)}
              className={cn(
                "flex items-center gap-2 w-full rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150",
                w.id === currentWorkspace.id && "bg-primary/10 text-primary"
              )}
              aria-label={`Switch to ${w.label}`}
            >
              <w.icon className={cn("h-4 w-4 shrink-0", w.id === currentWorkspace.id ? "text-primary" : "")} />
              {!collapsed && <span className="text-sm font-medium">{w.label}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="border-t p-2">
        <button
          onClick={toggleSidebar}
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

function WorkspaceTabs({
  activeWorkspace,
  availableWorkspaces,
  onSwitch,
}: {
  activeWorkspace: WorkspaceConfig;
  availableWorkspaces: WorkspaceConfig[];
  onSwitch: (id: WorkspaceId) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1" role="tablist">
      {availableWorkspaces.map((w: WorkspaceConfig) => (
        <button
          key={w.id}
          role="tab"
          aria-selected={w.id === activeWorkspace.id}
          onClick={() => onSwitch(w.id)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap shrink-0",
            w.id === activeWorkspace.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <w.icon className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">{w.label}</span>
        </button>
      ))}
    </div>
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
  const enabled = item.href.startsWith("/api") ? true : true; // isPhaseOnePath check removed for simplicity

  const renderLink = () => {
    if (!enabled) {
      return (
        <button
          onClick={() =>
            toast.info("Coming Soon", {
              description: "This feature will be available in a future update.",
            })
          }
          aria-label={`${item.label} (coming soon)`}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-150 group w-full text-left",
            "text-muted-foreground/40 hover:bg-muted/50 hover:text-muted-foreground cursor-default",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? item.label : undefined}
        >
          <item.icon className="h-4 w-4 shrink-0" />
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
        aria-label={item.label}
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
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <PermissionGate
      permission={item.permission}
      anyOf={item.anyOf}
      anyRole={item.roles}
      fallback={null}
    >
      {renderLink()}
    </PermissionGate>
  );
}