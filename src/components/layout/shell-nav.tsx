"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { WorkspaceId } from "@/config/navigation";
import { Search, Settings, Sun, Moon, Monitor, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatarDropdown } from "@/components/layout/user-avatar-dropdown";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { ChatDrawer } from "@/components/chat/chat-drawer";
import { DiagnosticsButton } from "@/components/diagnostics-button";

type ShellNavProps = {
  onSearchOpen: () => void;
};

export function ShellNav({ onSearchOpen }: ShellNavProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { currentWorkspace, availableWorkspaces, allWorkspaces, setWorkspace } = useWorkspace();
  const [chatOpen, setChatOpen] = useState(false);

  const handleWorkspaceSwitch = useCallback(
    (workspaceId: WorkspaceId) => {
      const targetHref = workspaceId === "my-work" ? "/" : `/${workspaceId}`;
      setWorkspace(workspaceId);
      router.push(targetHref);
    },
    [setWorkspace, router]
  );

  const toggleTheme = useCallback(() => {
    const themes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  }, [theme, setTheme]);

  return (
    <>
      {/* Brand (Mobile only — on desktop it lives in the floating sidebar) */}
      <Link href="/" className="flex items-center gap-3 font-semibold text-base tracking-tight shrink-0 group lg:hidden">
        <img
          src="/Logo/thl_logo.svg"
          alt="ThaibaHive Logo"
          width={36}
          height={36}
          className="rounded-lg transition-transform duration-200 group-hover:scale-105 h-9 w-9"
        />
        <img
          src="/Logo/thl_name.svg"
          alt="ThaibaHive"
          width={160}
          height={40}
          className="hidden sm:block object-contain h-10 w-auto"
        />
      </Link>

      {/* Desktop Workspace Selection - Topbar Left Corner */}
      <div id="tour-workspace-switcher" className="hidden lg:flex items-center gap-1 p-1 rounded-2xl bg-muted/40 border border-border/60 shadow-xs">
        {availableWorkspaces.map((w, idx) => {
          const isActive = w.id === currentWorkspace.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => handleWorkspaceSwitch(w.id)}
              aria-label={`Switch to ${w.label} workspace`}
              title={`${w.label} (Ctrl+Shift+${idx + 1})`}
              className={cn(
                "group relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 outline-none active:scale-95 focus-visible:ring-2 focus-visible:ring-ring shrink-0",
                isActive
                  ? "bg-card text-foreground shadow-xs border border-border/80 font-bold"
                  : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
              )}
            >
              <div className={cn("flex h-5 w-5 items-center justify-center rounded-md transition-transform duration-150 group-hover:scale-110", isActive ? w.bgColor : "bg-transparent")}>
                <w.icon className={cn("h-3.5 w-3.5", isActive ? w.color : "text-muted-foreground group-hover:text-foreground")} />
              </div>
              <span>{w.label}</span>
              {isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile Workspace Tabs - Segmented Pill Container (Mobile only) */}
      <div className="flex items-center gap-1 ml-2 sm:ml-4 mr-1 sm:mr-6 bg-muted/40 p-1 rounded-xl border border-border/50 max-w-[130px] xs:max-w-[180px] sm:max-w-none overflow-x-auto no-scrollbar shrink lg:hidden">
        {allWorkspaces.map((w) => {
          return (
            <button
              key={w.id}
              onClick={() => handleWorkspaceSwitch(w.id)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0",
              w.id === currentWorkspace.id
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
            aria-label={`Switch to ${w.label} workspace`}
            title={w.label}
          >
            <w.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden md:inline">{w.label}</span>
          </button>
        );
      })}
      </div>

      {/* Right side: Search, Chat, Notifications, Theme, Settings, Profile */}
      <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
        {/* Mobile Search (Desktop search moved to sidebar) */}
        <button
          onClick={onSearchOpen}
          aria-label="Search"
          className="flex lg:hidden items-center justify-center rounded-xl p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-150 min-w-[36px] min-h-[36px] shrink-0"
        >
          <Search className="h-[18px] w-[18px]" />
        </button>

        {/* Live Telemetry & Diagnostics HUD */}
        <DiagnosticsButton variant="pill" label="Diagnostics" className="hidden xl:inline-flex" />
        <DiagnosticsButton variant="icon" className="xl:hidden flex" />

        {/* Chat Drawer Toggle */}
        <button
          onClick={() => setChatOpen(true)}
          aria-label="Open Chat (Cmd+Shift+M)"
          className="relative rounded-xl p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0"
        >
          <MessageSquare className="h-[18px] w-[18px]" />
        </button>

        {/* Notifications */}
        <div className="shrink-0">
          <NotificationsMenu layout="header" />
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch theme (current: ${theme})`}
          className="rounded-xl p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0"
        >
          {theme === "light" && <Sun className="h-[18px] w-[18px]" />}
          {theme === "dark" && <Moon className="h-[18px] w-[18px]" />}
          {theme === "system" && <Monitor className="h-[18px] w-[18px]" />}
        </button>

        {/* Settings */}
        <Link
          href="/my-work/settings"
          aria-label="Settings"
          className="hidden sm:flex rounded-xl p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 min-w-[36px] min-h-[36px] items-center justify-center shrink-0"
        >
          <Settings className="h-[18px] w-[18px]" />
        </Link>

        {/* User Profile Avatar */}
        <div className="shrink-0 pl-1 border-l border-border/60">
          <UserAvatarDropdown variant="icon" align="end" />
        </div>
      </div>

      <ChatDrawer open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
}
