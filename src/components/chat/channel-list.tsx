"use client";

import { useState } from "react";
import { ChatChannelItem } from "@/lib/hooks/use-chat";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Hash, User, Megaphone, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChannelListProps {
  channels: ChatChannelItem[];
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  presence?: Record<string, "online" | "away" | "offline">;
  onCreateChannel?: () => void;
}

export function ChannelList({
  channels,
  activeChannelId,
  onSelectChannel,
  presence: _presence = {},
  onCreateChannel,
}: ChannelListProps) {
  const [search, setSearch] = useState("");

  const filteredChannels = channels.filter((c) =>
    (c.name || "Direct Message").toLowerCase().includes(search.toLowerCase())
  );

  const directChannels = filteredChannels.filter((c) => c.type === "direct");
  const groupChannels = filteredChannels.filter((c) => c.type === "group");
  const announcementChannels = filteredChannels.filter((c) => c.type === "announcement");

  const renderChannelItem = (chan: ChatChannelItem) => {
    const isActive = chan.id === activeChannelId;
    const hasUnread = chan.unreadCount > 0;

    let Icon = Hash;
    if (chan.type === "direct") Icon = User;
    if (chan.type === "announcement") Icon = Megaphone;

    return (
      <button
        key={chan.id}
        onClick={() => onSelectChannel(chan.id)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm transition-all duration-150",
          isActive
            ? "bg-primary text-primary-foreground font-medium shadow-xs"
            : "hover:bg-muted text-muted-foreground hover:text-foreground",
          hasUnread && !isActive && "font-semibold text-foreground"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <span className="truncate flex-1">
            {chan.name || (chan.type === "direct" ? "Direct Message" : "Unnamed Channel")}
          </span>
        </div>

        {hasUnread && (
          <span
            className={cn(
              "ml-2 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold shrink-0",
              isActive
                ? "bg-primary-foreground text-primary"
                : "bg-primary text-primary-foreground"
            )}
          >
            {chan.unreadCount > 9 ? "9+" : chan.unreadCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card border-r w-64 select-none">
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">Channels</span>
          {onCreateChannel && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onCreateChannel}
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="Create channel"
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels..."
            className="h-8 pl-8 text-xs rounded-lg"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {announcementChannels.length > 0 && (
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Announcements
            </p>
            {announcementChannels.map(renderChannelItem)}
          </div>
        )}

        {groupChannels.length > 0 && (
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Groups
            </p>
            {groupChannels.map(renderChannelItem)}
          </div>
        )}

        {directChannels.length > 0 && (
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Direct Messages
            </p>
            {directChannels.map(renderChannelItem)}
          </div>
        )}

        {filteredChannels.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No channels found
          </div>
        )}
      </div>
    </div>
  );
}
