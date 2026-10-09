"use client";

import { useEffect, useRef } from "react";
import { ChatMessageItem } from "@/lib/hooks/use-chat";
import { ReadReceiptBadge } from "./read-receipt-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MessageThreadProps {
  messages: ChatMessageItem[];
  currentUserId: string;
  typingUsers?: string[];
  isLoading?: boolean;
  onReply?: (message: ChatMessageItem) => void;
}

export function MessageThread({
  messages,
  currentUserId,
  typingUsers = [],
  isLoading = false,
  onReply,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (bottomRef.current && typeof bottomRef.current.scrollIntoView === "function") {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, typingUsers.length]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-2 max-w-[70%]",
              i % 2 === 0 ? "ml-auto flex-row-reverse" : ""
            )}
          >
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              <div className="h-10 w-full bg-muted animate-pulse rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <p className="text-sm font-medium">No messages yet</p>
        <p className="text-xs mt-1">Send a message to start the conversation.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg, index) => {
        const isMe = msg.senderId === currentUserId;
        const prevMsg = index > 0 ? messages[index - 1] : null;
        const isSameSenderAsPrev = prevMsg && prevMsg.senderId === msg.senderId;
        const senderName = msg.sender
          ? `${msg.sender.firstName || ""} ${msg.sender.lastName || ""}`.trim()
          : "Colleague";
        const initials = senderName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2) || "?";

        const timeString = new Date(msg.createdAt).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div
            key={msg.id || msg.clientMessageId || index}
            className={cn(
              "flex items-end gap-2",
              isMe ? "justify-end" : "justify-start",
              isSameSenderAsPrev ? "mt-1" : "mt-3"
            )}
          >
            {!isMe && (
              <Avatar className="w-7 h-7 shrink-0 mb-1">
                <AvatarImage src={msg.sender?.avatarUrl || undefined} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            )}

            <div
              className={cn(
                "group relative max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm transition-all",
                isMe
                  ? "bg-primary text-primary-foreground rounded-br-xs"
                  : "bg-muted text-foreground rounded-bl-xs",
                msg.deletedAt && "italic opacity-70"
              )}
            >
              {!isMe && !isSameSenderAsPrev && (
                <p className="text-[11px] font-semibold text-primary mb-0.5">
                  {senderName}
                </p>
              )}

              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {msg.content}
              </p>

              <div
                className={cn(
                  "mt-1 flex items-center justify-end gap-1 text-[10px]",
                  isMe ? "text-primary-foreground/75" : "text-muted-foreground"
                )}
              >
                {msg.editedAt && <span>(edited)</span>}
                <span>{timeString}</span>
                {isMe && <ReadReceiptBadge status={msg.status || "sent"} />}
              </div>
            </div>
          </div>
        );
      })}

      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground italic px-2 py-1 animate-pulse">
          <span>Someone is typing...</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
