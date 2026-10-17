"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronLeft, ChevronRight, ChevronDown, Check, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores";
import { PermissionGate } from "@/components/ui/permission-gate";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getItemsForWorkspace, type NavItem } from "@/config/navigation";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { UserAvatarDropdown } from "@/components/layout/user-avatar-dropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type DesktopSideNavProps = {
  onSearchOpen: () => void;
};

export function DesktopSideNav({ onSearchOpen }: DesktopSideNavProps) {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const { currentWorkspace, availableWorkspaces, setWorkspace } = useWorkspace();
  const { theme, setTheme } = useTheme();

  const items = useMemo(() => getItemsForWorkspace(currentWorkspace.id), [currentWorkspace.id]);

  // Longest-prefix match so only the single most specific item is ever active
  const activeHref = useMemo(() => {
    const matches = items.filter(
      (i) => pathname === i.href || pathname.startsWith(i.href + "/")
    );
    if (matches.length === 0) return null;
    return matches.reduce((a, b) => (a.href.length >= b.href.length ? a : b)).href;
  }, [items, pathname]);

  // Restore persisted collapse state after hydration (auto-collapse on smaller desktop viewports)
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") {
      setSidebarCollapsed(true);
    } else if (stored === null && typeof window !== "undefined" && window.innerWidth < 1280) {
      setSidebarCollapsed(true);
    }
  }, [setSidebarCollapsed]);

  // Keep layout padding in sync with sidebar width + persist choice.
  // The width itself is driven by CSS tokens via `data-sidebar-collapsed`
  // (see globals.css) — no hardcoded px here, no var() indirection.
  // The pre-paint script in app/layout.tsx already applied the persisted
  // value, so the very first run must not clobber a pending auto-collapse.
  const sidebarAttrPrimedRef = useRef(true);
  useEffect(() => {
    if (collapsed) {
      document.documentElement.setAttribute("data-sidebar-collapsed", "true");
    } else if (!sidebarAttrPrimedRef.current) {
      document.documentElement.removeAttribute("data-sidebar-collapsed");
    }
    if (sidebarAttrPrimedRef.current) {
      sidebarAttrPrimedRef.current = false;
      return;
    }
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  function cycleTheme() {
    const themes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    setTheme(themes[(currentIndex + 1) % themes.length]);
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 260 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      // Responsive left positioning: hugs content on ultra-wide viewports while maintaining
      // minimum 1.5rem (24px) margin on standard laptops (1024px-1440px). Strict W3C calc spacing.
      style={{
        left:
          "max(1.5rem, calc((100vw - var(--content-max-width, 80rem)) / 2 - var(--current-sidebar-width, 260px) - 1.5rem))",
      }}
      className="fixed top-1/2 z-40 hidden max-h-[calc(100vh-3rem)] w-fit -translate-y-1/2 select-none flex-col overflow-hidden rounded-[32px] border border-border bg-card/95 backdrop-blur-xl shadow-[0_20px_40px_-16px_rgba(0,0,0,0.18)] lg:flex dark:shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8)]"
      aria-label="Main navigation"
    >
      {/* 1. Brand Header */}
      <div
        className={cn(
          "flex min-h-[80px] shrink-0 items-center border-b border-border/60 px-4 py-4 transition-all duration-300",
          collapsed && "justify-center px-0"
        )}
      >
        <Link
          href="/"
          aria-label="ThaibaHive home"
          className="group relative flex w-full cursor-pointer items-center outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
        >
          <img
            src="/Logo/thl_logo.svg"
            alt=""
            width={56}
            height={56}
            className={cn(
              "shrink-0 rounded-xl shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
              collapsed ? "h-11 w-11" : "h-14 w-14",
              collapsed && "mx-auto"
            )}
          />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10, filter: "blur(8px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -10, filter: "blur(8px)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="ml-3 flex min-w-0 flex-col"
              >
                <img
                  src="/Logo/thl_name.svg"
                  alt="ThaibaHive"
                  className="h-7 w-auto max-w-[150px] object-contain object-left"
                />
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <span className="micro-label font-bold text-primary">Campus OS</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* 2. Content Area */}
      <div className="no-scrollbar flex-1 min-h-0 overflow-y-auto py-6">
        {/* Identity cluster: workspace, search, alerts, appearance, profile */}
        <div className={cn("mb-8 flex flex-col gap-2 px-4", collapsed && "items-center")}>
          {/* Workspace Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Workspace: ${currentWorkspace.label}`}
                title={currentWorkspace.label}
                className={cn(
                  "group flex h-12 w-full items-center rounded-[18px] transition-all duration-300 outline-none hover:bg-foreground/[0.03] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring",
                  collapsed && "justify-center"
                )}
              >
                <div className="grid w-full grid-cols-[40px_1fr] items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                    <currentWorkspace.icon
                      size={20}
                      className="text-primary drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all duration-300 group-hover:scale-110"
                    />
                  </div>
                  {!collapsed && (
                    <div className="ml-4 flex items-center justify-between overflow-hidden pr-3 text-left">
                      <div className="flex min-w-0 flex-col">
                        <span className="micro-label mb-1 leading-none text-foreground/60">
                          Workspace
                        </span>
                        <span className="truncate text-sm font-bold leading-none text-foreground">
                          {currentWorkspace.label}
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4 shrink-0 text-foreground/50 transition-transform duration-200 group-aria-expanded:rotate-180" />
                    </div>
                  )}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={8} className="w-72 rounded-2xl p-2">
              {availableWorkspaces.map((w) => (
                <DropdownMenuItem
                  key={w.id}
                  onClick={() => setWorkspace(w.id)}
                  className={cn(
                    "gap-3 rounded-xl px-3 py-2.5 focus:bg-foreground/[0.05]",
                    w.id === currentWorkspace.id && "bg-primary/10"
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground/5">
                    <w.icon className={cn("h-4 w-4", w.id === currentWorkspace.id ? "text-primary" : "text-foreground/70")} />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold">{w.label}</span>
                    <span className="truncate text-[11px] text-muted-foreground">{w.description}</span>
                  </div>
                  {w.id === currentWorkspace.id && (
                    <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search */}
          {collapsed ? (
            <button
              type="button"
              onClick={onSearchOpen}
              aria-label="Search"
              title="Search"
              className="group flex h-12 w-full items-center rounded-[18px] transition-all duration-300 outline-none hover:bg-foreground/[0.03] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="grid w-full grid-cols-[40px_1fr] items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                  <Search size={20} className="text-foreground/70 transition-colors group-hover:text-foreground" />
                </div>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSearchOpen}
              className="flex w-full items-center gap-2.5 rounded-full border border-border/60 bg-muted/40 px-3.5 py-2.5 text-left text-sm text-muted-foreground transition-all duration-150 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">Search {currentWorkspace.label}...</span>
              <kbd className="rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                Ctrl K
              </kbd>
            </button>
          )}

          {/* Notifications */}
          <NotificationsMenu layout="row" collapsed={collapsed} />

          {/* Appearance / Theme */}
          <button
            type="button"
            onClick={cycleTheme}
            aria-label={`Switch theme (current: ${theme})`}
            className={cn(
              "group flex h-12 w-full items-center rounded-[18px] transition-all duration-300 outline-none hover:bg-foreground/[0.03] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring",
              collapsed && "justify-center"
            )}
          >
            <div className="grid w-full grid-cols-[40px_1fr] items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                {theme === "light" && <Sun size={20} className="text-foreground/70 transition-colors group-hover:text-foreground" />}
                {theme === "dark" && <Moon size={20} className="text-foreground/70 transition-colors group-hover:text-foreground" />}
                {theme === "system" && <Monitor size={20} className="text-foreground/70 transition-colors group-hover:text-foreground" />}
              </div>
              {!collapsed && (
                <div className="ml-4 flex flex-col overflow-hidden text-left">
                  <span className="micro-label mb-1 leading-none text-foreground/60">Appearance</span>
                  <span className="truncate text-sm font-bold leading-none text-foreground/80 transition-colors group-hover:text-foreground">
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </span>
                </div>
              )}
            </div>
          </button>

          {/* Profile */}
          <UserAvatarDropdown variant="row" collapsed={collapsed} align="start" />
        </div>

        <div className="mx-6 mb-8 h-px bg-border/60" />

        {/* Main Navigation */}
        <nav
          className="space-y-4 px-4"
          aria-label={`${currentWorkspace.label} navigation`}
        >
          {!collapsed && (
            <h3 className="micro-label whitespace-nowrap pl-[56px] text-foreground/70">
              {currentWorkspace.label}
            </h3>
          )}
          <div className="space-y-1">
            {items.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={activeHref === item.href}
                collapsed={collapsed}
              />
            ))}
          </div>
        </nav>
      </div>

      {/* 3. Footer / Collapse Trigger */}
      <div className="mt-auto shrink-0 border-t border-border/60 p-4">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="group flex h-12 w-full items-center justify-center rounded-xl transition-all outline-none active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {collapsed ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5 text-foreground/70 transition-all group-hover:bg-primary/10 group-hover:text-primary">
              <ChevronRight size={18} />
            </div>
          ) : (
            <div className="flex h-9 items-center gap-2 rounded-xl bg-foreground/[0.05] px-4 text-foreground/70 transition-all group-hover:bg-foreground/10 group-hover:text-foreground">
              <ChevronLeft size={16} />
              <span className="micro-label">Collapse</span>
            </div>
          )}
        </button>
      </div>
    </motion.aside>
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
  return (
    <PermissionGate
      permission={item.permission}
      anyOf={item.anyOf}
      anyRole={item.roles}
      fallback={null}
    >
      <Link
        href={item.href}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(
          "group relative flex h-12 w-full items-center overflow-hidden rounded-[18px] transition-all duration-300 ease-out outline-none active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring",
          active
            ? "bg-foreground/[0.06] shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.05)]"
            : "text-foreground/80 hover:bg-foreground/[0.03]"
        )}
      >
        {active && (
          <motion.span
            layoutId="desktop-nav-active-pill"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute left-0 h-6 w-1 rounded-r-full bg-primary shadow-[0_0_15px_rgba(16,185,129,0.8)]"
          />
        )}
        <div className="grid w-full grid-cols-[40px_1fr] items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            <item.icon
              size={20}
              strokeWidth={active ? 2.5 : 2}
              className={cn(
                "transition-all duration-300",
                active
                  ? "text-primary drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  : "text-inherit group-hover:text-foreground"
              )}
            />
          </div>
          {!collapsed && (
            <div className="ml-4 flex-1 overflow-hidden pr-4 text-left">
              <span
                className={cn(
                  "truncate text-sm font-bold tracking-tight transition-colors duration-300",
                  active ? "text-foreground" : "text-inherit group-hover:text-foreground"
                )}
              >
                {item.label}
              </span>
            </div>
          )}
        </div>
      </Link>
    </PermissionGate>
  );
}
