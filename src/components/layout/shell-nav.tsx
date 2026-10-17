"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Search, Settings, Sun, Moon, Monitor, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatarDropdown } from "@/components/layout/user-avatar-dropdown";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { ChatDrawer } from "@/components/chat/chat-drawer";

type ShellNavProps = {
  onSearchOpen: () => void;
};

export function ShellNav({ onSearchOpen }: ShellNavProps) {
  const { theme, setTheme } = useTheme();
  const { currentWorkspace, allWorkspaces, setWorkspace } = useWorkspace();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      {/* Brand */}
      <Link href="/" className="flex items-center gap-3 font-semibold text-base tracking-tight shrink-0 group">
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

      {/* Workspace Tabs - Segmented Pill Container */}
      <div className="flex items-center gap-1 ml-2 sm:ml-4 mr-2 sm:mr-6 bg-muted/40 p-1 rounded-xl border border-border/50">
        {allWorkspaces.map((w) => (
          <button
            key={w.id}
            onClick={() => setWorkspace(w.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0",
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
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Search */}
        <button
          onClick={onSearchOpen}
          aria-label="Search"
          className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search...</span>
        </button>

        {/* Chat Drawer Toggle */}
        <button
          onClick={() => setChatOpen(true)}
          aria-label="Open Chat (Cmd+Shift+M)"
          className="relative rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 min-w-[40px] min-h-[40px] flex items-center justify-center"
        >
          <MessageSquare className="h-[18px] w-[18px]" />
        </button>

        {/* Notifications */}
        <NotificationsMenu layout="header" />

        {/* Theme Toggle */}
        <button
          onClick={() => {
            const themes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
            const currentIndex = themes.indexOf(theme);
            const nextTheme = themes[(currentIndex + 1) % themes.length];
            setTheme(nextTheme);
          }}
          aria-label={`Switch theme (current: ${theme})`}
          className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 min-w-[40px] min-h-[40px] flex items-center justify-center"
        >
          {theme === "light" && <Sun className="h-[18px] w-[18px]" />}
          {theme === "dark" && <Moon className="h-[18px] w-[18px]" />}
          {theme === "system" && <Monitor className="h-[18px] w-[18px]" />}
        </button>

        {/* Settings */}
        <Link
          href="/my-work/settings"
          aria-label="Settings"
          className="hidden sm:flex rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 min-w-[40px] min-h-[40px] items-center justify-center"
        >
          <Settings className="h-[18px] w-[18px]" />
        </Link>

        {/* User menu */}
        <UserAvatarDropdown />
      </div>

      <ChatDrawer open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
}
