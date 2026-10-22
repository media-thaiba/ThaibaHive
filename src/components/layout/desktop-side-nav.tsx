"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores";
import { PermissionGate } from "@/components/ui/permission-gate";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { getItemsForWorkspace, type NavItem } from "@/config/navigation";

type DesktopSideNavProps = {
  onSearchOpen?: () => void;
};

export function DesktopSideNav({ onSearchOpen }: DesktopSideNavProps) {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const { currentWorkspace } = useWorkspace();

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

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 260 }}
      transition={{ type: "spring", bounce: 0, duration: 0.32 }}
      // Responsive left positioning: hugs content on ultra-wide viewports while maintaining
      // minimum 1.5rem (24px) margin on standard laptops (1024px-1440px). Strict W3C calc spacing.
      style={{
        left:
          "max(1.5rem, calc((100vw - var(--content-max-width, 80rem)) / 2 - var(--current-sidebar-width, 260px) - 1.5rem))",
      }}
      className="fixed top-20 z-40 hidden max-h-[calc(100vh-3rem)] w-fit select-none flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/90 backdrop-blur-2xl shadow-lg lg:flex dark:border-white/10 dark:shadow-[0_16px_36px_rgba(0,0,0,0.45)]"
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
          className="group relative flex w-full cursor-pointer items-center outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
        >
          <img
            src="/Logo/thl_logo.svg"
            alt=""
            width={56}
            height={56}
            className={cn(
              "shrink-0 rounded-xl shadow-xs transition-transform duration-200 group-hover:scale-[1.03] group-active:scale-[0.98]",
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
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="micro-label font-bold text-primary">Campus OS</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* 2. Content Area */}
      <div className="no-scrollbar flex-1 min-h-0 overflow-y-auto py-5">
        {/* Minimal Search Button (No Ctrl+K badge) */}
        <div className={cn("mb-3 px-4", collapsed && "px-2")}>
          <button
            type="button"
            onClick={onSearchOpen}
            aria-label="Search my space"
            title="Search my space"
            className={cn(
              "group flex items-center rounded-xl border border-border/70 bg-muted/40 text-xs text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-[0.98]",
              collapsed ? "h-10 w-10 justify-center mx-auto" : "w-full gap-2.5 px-3 py-2"
            )}
          >
            <Search className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
            {!collapsed && <span className="truncate">Search my space...</span>}
          </button>
        </div>

        {/* Main Navigation */}
        <nav
          className="space-y-4 px-4"
          aria-label={`${currentWorkspace.label} navigation`}
        >
          {!collapsed && (
            <h3 className="micro-label whitespace-nowrap pl-4 text-foreground/70 uppercase tracking-wider font-bold">
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
          "group relative flex h-12 w-full items-center overflow-hidden rounded-xl transition-all duration-200 ease-out outline-none active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring content-visibility-auto",
          active
            ? "bg-foreground/[0.06] shadow-xs"
            : "text-foreground/80 hover:bg-foreground/[0.03]"
        )}
      >
        {active && (
          <motion.span
            layoutId="desktop-nav-active-pill"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="absolute left-0 h-6 w-1 rounded-r-full bg-primary"
          />
        )}
        <div className="grid w-full grid-cols-[40px_1fr] items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            <item.icon
              size={20}
              strokeWidth={active ? 2.5 : 2}
              className={cn(
                "transition-colors duration-200",
                active
                  ? "text-primary"
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
