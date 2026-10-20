"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, Shield, Sparkles, User } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const GuidedTour = dynamic(
  () => import("@/components/dashboard/guided-tour").then((m) => m.GuidedTour),
  { ssr: false }
);

type UserAvatarDropdownProps = {
  /** "icon" = avatar only (mobile top bar). "row" = full sidebar identity row with name + role. */
  variant?: "icon" | "row";
  collapsed?: boolean;
  align?: "start" | "end";
};

export function UserAvatarDropdown({ variant = "icon", collapsed = false, align = "end" }: UserAvatarDropdownProps) {
  const { staff, logout } = useAuth();
  const [tourActive, setTourActive] = useState(false);

  if (!staff) return null;

  const fullName = `${staff.firstName} ${staff.lastName}`.trim();

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
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500 shadow-sm" />
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
        <Avatar
          src={staff.avatarUrl}
          alt={fullName}
          fallback={fullName}
          size="md"
          className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
        />
      </button>
    );

  return (
    <>
    <DropdownMenu>
      {variant === "row" ? (
        trigger
      ) : (
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      )}
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{fullName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {staff.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground capitalize">
              {staff.role}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild inset>
          <Link
            href="/my-work/settings"
            className="flex items-center gap-2 w-full"
          >
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
        <DropdownMenuItem
          inset
          onSelect={() => setTourActive(true)}
          className="flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          <span>Take Tour</span>
        </DropdownMenuItem>
        {(staff.role === "super_admin" || staff.role === "admin") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild inset>
              <Link
                href="/admin/institutions"
                className="flex items-center gap-2 w-full"
              >
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
