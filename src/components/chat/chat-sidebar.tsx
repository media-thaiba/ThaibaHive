"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PresenceDot } from "@/components/ui/presence-dot";
import { Plus, Search, MessageSquare, Users } from "lucide-react";
import { useState } from "react";
import { usePresence } from "@/hooks/usePresence";

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

type Participant = {
  id: string;
  roomId: string;
  staffId: string;
  role: string;
  staff: StaffMember | null;
};

type Room = {
  id: string;
  name: string | null;
  lastMessageTime: string | null;
  lastMessagePreview: string | null;
  iconUrl: string | null;
  unreadCount: number;
  participants: Participant[];
};

type ChatSidebarProps = {
  rooms: Room[];
  activeRoomId: string | null;
  onSelectRoom: (id: string) => void;
  onNewChat: () => void;
  loading: boolean;
  currentStaffId: string | null;
};

function formatTime(isoStr: string | null): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function getRoomDisplay(room: Room): {
  name: string;
  icon: string | null;
  isGroup: boolean;
} {
  const isGroup = !!room.name;
  const displayName = room.name || "Unknown";

  return {
    name: displayName,
    icon: room.iconUrl,
    isGroup,
  };
}

export function ChatSidebar({
  rooms,
  activeRoomId,
  onSelectRoom,
  onNewChat,
  loading,
  currentStaffId,
}: ChatSidebarProps) {
  const [search, setSearch] = useState("");
  const { getPresence } = usePresence();

  const filteredRooms = rooms.filter((room) => {
    if (!search) return true;
    const display = getRoomDisplay(room);
    return display.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="w-80 border-r flex flex-col bg-background">
      <div className="p-3 border-b flex items-center gap-2">
        <h2 className="font-semibold text-sm flex-1">Messages</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onNewChat}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-2 space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {search ? "No conversations found" : "No conversations yet"}
          </div>
        ) : (
          filteredRooms.map((room) => {
            const display = getRoomDisplay(room);
            const isActive = room.id === activeRoomId;
            return (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                className={`w-full text-left p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors ${
                  isActive ? "bg-muted" : ""
                }`}
              >
                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {display.icon ? (
                      <img
                        src={display.icon}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : display.isGroup ? (
                      <Users className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  {!display.isGroup && (() => {
                    const otherParticipant = room.participants.find(
                      (p) => p.staffId !== currentStaffId
                    );
                    if (!otherParticipant) return null;
                    const p = getPresence(otherParticipant.staffId);
                    return (
                      <span className="absolute -bottom-0.5 -right-0.5">
                        <PresenceDot
                          online={p?.online ?? false}
                          status={p?.status ?? "active"}
                        />
                      </span>
                    );
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {display.name}
                    </span>
                    {room.lastMessageTime && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(room.lastMessageTime)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground truncate flex-1">
                      {room.lastMessagePreview || "No messages yet"}
                    </p>
                    {room.unreadCount > 0 && (
                      <Badge
                        variant="default"
                        className="h-5 min-w-5 px-1 text-xs"
                      >
                        {room.unreadCount > 99 ? "99+" : room.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
