"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/hooks/usePresence";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, Shield, Sparkles, User, Check } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const GuidedTour = dynamic(
  () => import("@/components/dashboard/guided-tour").then((m) => m.GuidedTour),
  { ssr: false }
);

const STATUS_OPTIONS = [
  { value: "active", label: "Active", dotColor: "bg-emerald-500" },
  { value: "busy", label: "Busy", dotColor: "bg-rose-500" },
  { value: "meeting", label: "In Meeting", dotColor: "bg-amber-500" },
  { value: "away", label: "Away", dotColor: "bg-slate-400" },
] as const;

type UserAvatarDropdownProps = {
  /** "icon" = avatar only (mobile top bar). "row" = full sidebar identity row with name + role. */
  variant?: "icon" | "row";
  collapsed?: boolean;
  align?: "start" | "end";
};

export function UserAvatarDropdown({ variant = "icon", collapsed = false, align = "end" }: UserAvatarDropdownProps) {
  const { staff, logout } = useAuth();
  const { getPresence } = usePresence();
  const queryClient = useQueryClient();
  const [tourActive, setTourActive] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fullName = staff ? `${staff.firstName} ${staff.lastName}`.trim() : "";
  const currentPresence = staff ? getPresence(staff.id) : null;
  const currentStatus = currentPresence?.status || "active";
  const currentOption = STATUS_OPTIONS.find((o) => o.value === currentStatus) || STATUS_OPTIONS[0];

  const handleUpdateStatus = useCallback(
    async (newStatus: string) => {
      if (newStatus === currentStatus || updatingStatus) return;
      setUpdatingStatus(true);
      try {
        const res = await fetch("/api/presence/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
          const opt = STATUS_OPTIONS.find((o) => o.value === newStatus);
          toast.success(`Status updated to ${opt?.label ?? newStatus}`);
          queryClient.invalidateQueries({ queryKey: ["presence"] });
        } else {
          toast.error("Failed to update status");
        }
      } catch {
        toast.error("Failed to update status");
      } finally {
        setUpdatingStatus(false);
      }
    },
    [currentStatus, updatingStatus, queryClient]
  );

  if (!staff) return null;

  const trigger =
    variant === "row" ? (
      <DropdownMenuTrigger
        aria-label="User profile and settings menu"
        className={cn(
          "group flex h-12 w-full items-center rounded-xl transition-all duration-200 outline-none hover:bg-foreground/[0.03] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring",
          collapsed && "justify-center"
        )}
      >
        <div className="grid w-full grid-cols-[40px_1fr] items-center">
          <div className="relative h-10 w-10 shrink-0">
            <Avatar
              src={staff.avatarUrl}
              alt={fullName}
              fallback={fullName}
              size="lg"
              className="ring-1 ring-foreground/15 transition-all duration-300 group-hover:ring-primary/50"
            />
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background shadow-xs transition-colors",
                currentOption.dotColor
              )}
            />
          </div>
          {!collapsed && (
            <div className="ml-4 flex flex-col overflow-hidden text-left">
              <span className="mb-1 truncate text-sm font-bold leading-none tracking-tight text-foreground transition-colors group-hover:text-primary">
                {fullName || "User"}
              </span>
              <span className="micro-label truncate leading-none text-foreground/70">
                {staff.role.replace(/_/g, " ")}
              </span>
            </div>
          )}
        </div>
      </DropdownMenuTrigger>
    ) : (
      <button
        type="button"
        aria-label="User profile and settings menu"
        className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative">
          <Avatar
            src={staff.avatarUrl}
            alt={fullName}
            fallback={fullName}
            size="md"
            className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
          />
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background shadow-xs transition-colors",
              currentOption.dotColor
            )}
          />
        </div>
      </button>
    );

  return (
    <>
      <DropdownMenu>
        {variant === "row" ? trigger : <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>}
        <DropdownMenuContent align={align} className="w-64">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{fullName}</p>
              <p className="text-xs leading-none text-muted-foreground">{staff.email}</p>
              <p className="text-xs leading-none text-muted-foreground capitalize">
                {staff.role.replace(/_/g, " ")}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Quick Status Switcher */}
          <div className="px-2 py-2">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Set Availability
              </span>
              <Link
                href="/my-work/availability"
                className="text-[10px] font-medium text-primary hover:underline"
              >
                Full View &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {STATUS_OPTIONS.map((opt) => {
                const isCurrent = currentStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={updatingStatus}
                    onClick={(e) => {
                      e.preventDefault();
                      handleUpdateStatus(opt.value);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-left",
                      isCurrent
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "hover:bg-muted text-foreground/80 border border-transparent"
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full shrink-0", opt.dotColor)} />
                    <span className="truncate">{opt.label}</span>
                    {isCurrent && <Check className="h-3 w-3 ml-auto text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
          <DropdownMenuSeparator />

          <DropdownMenuItem asChild inset>
            <Link href="/my-work/settings" className="flex items-center gap-2 w-full">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild inset>
            <Link
              href={staff ? `/admin/staff/${staff.id}/edit` : "/admin/staff"}
              className="flex items-center gap-2 w-full"
            >
              <User className="h-4 w-4" />
              <span>My Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem inset onSelect={() => setTourActive(true)} className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>Take Tour</span>
          </DropdownMenuItem>
          {(staff.role === "super_admin" || staff.role === "admin") && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild inset>
                <Link href="/admin/institutions" className="flex items-center gap-2 w-full">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-medium">Admin Panel</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            inset
            onClick={async () => {
              await logout();
            }}
            className="text-destructive focus:text-destructive flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <GuidedTour active={tourActive} onClose={() => setTourActive(false)} />
    </>
  );
}
