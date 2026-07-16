"use client";

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
import { LogOut, Settings, Shield, User } from "lucide-react";
import Link from "next/link";

export function UserAvatarDropdown() {
  const { staff, logout } = useAuth();

  if (!staff) return null;

  const fullName = `${staff.firstName} ${staff.lastName}`.trim();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar
          src={staff.avatarUrl}
          alt={fullName}
          fallback={fullName}
          size="md"
          className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
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
            href="/settings"
            className="flex items-center gap-2 w-full"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild inset>
          <Link
            href="/staff"
            className="flex items-center gap-2 w-full"
          >
            <User className="h-4 w-4" />
            <span>My Profile</span>
          </Link>
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
  );
}