"use client";

import { useState, useEffect } from "react";
import { useChat } from "@/lib/hooks/use-chat";
import { ChannelList } from "./channel-list";
import { MessageThread } from "./message-thread";
import { MessageInput } from "./message-input";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, X, WifiOff, Hash } from "lucide-react";

interface ChatDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ChatDrawer({ open: controlledOpen, onOpenChange: controlledOnOpenChange }: ChatDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;

  const { staff } = useAuth();
  const {
    channels,
    activeChannelId,
    setActiveChannelId,
    messages,
    presence,
    typingUsers,
    isConnected,
    isLoadingChannels: _isLoadingChannels,
    isLoadingMessages,
    sendMessage,
    sendTyping,
    markAsRead,
  } = useChat();

  // Listen for global Cmd+Shift+M / Ctrl+Shift+M
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "M" || e.key === "m")) {
        e.preventDefault();
        setOpen(!isOpen);
      }
    };

    const handleCustomOpen = () => {
      setOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-chat-drawer", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-chat-drawer", handleCustomOpen);
    };
  }, [isOpen, setOpen]);

  // Mark active channel messages as read when drawer is open
  useEffect(() => {
    if (isOpen && activeChannelId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.senderId !== staff?.id) {
        markAsRead(activeChannelId, lastMsg.id);
      }
    }
  }, [isOpen, activeChannelId, messages, staff?.id, markAsRead]);

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        showCloseButton={false}
        className="sm:max-w-4xl sm:h-screen sm:max-h-screen sm:rounded-none sm:border-l p-0 gap-0"
        aria-describedby="chat-drawer-desc"
      >
        <div className="sr-only">
          <SheetTitle>Chat & Messaging Center</SheetTitle>
          <SheetDescription id="chat-drawer-desc">
            Bi-directional real-time chat with campus colleagues and departments.
          </SheetDescription>
        </div>

        {/* Top Drawer Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-card shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base text-foreground">ThaibaHive Chat</h2>
            <div className="flex items-center gap-1.5 ml-2 text-xs text-muted-foreground">
              {isConnected ? (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-500 font-medium">
                  <WifiOff className="w-3 h-3" />
                  Connecting
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-mono">
              Cmd+Shift+M
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-lg"
              aria-label="Close chat drawer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Body: Channel List + Active Chat Window */}
        <div className="flex-1 flex overflow-hidden">
          <ChannelList
            channels={channels}
            activeChannelId={activeChannelId}
            onSelectChannel={(id) => setActiveChannelId(id)}
            presence={presence}
          />

          <div className="flex-1 flex flex-col h-full bg-background min-w-0">
            {activeChannel ? (
              <>
                {/* Active Channel Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b bg-card shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="font-semibold text-sm truncate text-foreground">
                      {activeChannel.name || (activeChannel.type === "direct" ? "Direct Message" : "Channel")}
                    </span>
                  </div>
                </div>

                {/* Messages View */}
                <MessageThread
                  messages={messages}
                  currentUserId={staff?.id || ""}
                  typingUsers={typingUsers}
                  isLoading={isLoadingMessages}
                />

                {/* Input Area */}
                <MessageInput
                  onSendMessage={sendMessage}
                  onTyping={sendTyping}
                  placeholder={`Message ${activeChannel.name ? "#" + activeChannel.name : "chat"}...`}
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <MessageSquare className="w-10 h-10 opacity-20 mb-2" />
                <p className="font-medium text-sm">Select a channel to begin</p>
                <p className="text-xs mt-1">Choose a channel from the left sidebar or start a new conversation.</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
