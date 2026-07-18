"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import {
  Send,
  Paperclip,
  ArrowDown,
  Trash2,
} from "lucide-react";
import { subscribeChat } from "@/lib/realtime/chat";

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
  createdById: string;
  lastMessageTime: string | null;
  lastMessagePreview: string | null;
  iconUrl: string | null;
  createdAt: string;
  unreadCount: number;
  participants: Participant[];
};

type Message = {
  id: string;
  roomId: string;
  senderId: string;
  text: string | null;
  mediaUrl: string | null;
  mediaType: string;
  createdAt: string;
  sender: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
};

type ChatWindowProps = {
  room: Room;
  onRefresh: () => void;
  currentStaffId: string | null;
};

function formatMessageTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function formatDateHeader(isoStr: string): string {
  const d = new Date(isoStr);
  const now = new Date();
  if (isSameDay(isoStr, now.toISOString())) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(isoStr, yesterday.toISOString())) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function ChatWindow({
  room,
  onRefresh,
  currentStaffId,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  const fetchMessages = useCallback(
    async (before?: string) => {
      try {
        const params = new URLSearchParams({ limit: "50" });
        if (before) params.set("before", before);
        const data = await fetch(
          `/api/chat/rooms/${room.id}/messages?${params}`
        ).then((r) => r.json());
        const msgs = Array.isArray(data.messages) ? data.messages : [];

        if (before) {
          setMessages((prev) => [...msgs, ...prev]);
        } else {
          setMessages(msgs);
        }
        setHasMore(data.hasMore ?? false);
        return msgs;
      } catch {
        return [];
      }
    },
    [room.id]
  );

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setHasMore(true);
    fetchMessages().then(() => {
      setLoading(false);
      setTimeout(() => scrollToBottom(false), 50);
    });
  }, [room.id, fetchMessages, scrollToBottom]);

  useEffect(() => {
    if (!currentStaffId) return;

    const unsubscribe = subscribeChat((event) => {
      if ("roomId" in event && event.roomId !== room.id) return;

      if (event.type === "new_message" && "message" in event) {
        const msg = event.message as Message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => scrollToBottom(true), 50);

        fetch(`/api/chat/rooms/${room.id}/participants`, {
          method: "PATCH",
        }).catch(() => {});
      } else if (event.type === "messages_cleared") {
        setMessages([]);
        onRefresh();
      }
    });

    return () => unsubscribe();
  }, [room.id, currentStaffId, scrollToBottom, onRefresh]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (currentStaffId) {
      fetch(`/api/chat/rooms/${room.id}/participants`, {
        method: "PATCH",
      }).catch(() => {});
    }
  }, [room.id, currentStaffId, messages.length]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[0]?.createdAt;
    if (oldest) {
      await fetchMessages(oldest);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, messages, fetchMessages]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newMessage.trim() }),
      });
      if (res.ok) {
        setNewMessage("");
        setTimeout(() => scrollToBottom(true), 50);
      }
    } catch {
      // Silently fail
    } finally {
      setSending(false);
    }
  }, [newMessage, sending, room.id, scrollToBottom]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadingFile(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/chat/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const uploadData = await uploadRes.json();

        const mediaType = file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("audio/")
            ? "voice"
            : "document";

        const res = await fetch(`/api/chat/rooms/${room.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaUrl: uploadData.url,
            mediaType,
            text: mediaType === "document" ? file.name : undefined,
          }),
        });
        if (res.ok) {
          setTimeout(() => scrollToBottom(true), 50);
        }
      } catch {
        // Silently fail
      } finally {
        setUploadingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [room.id, scrollToBottom]
  );

  const handleClearHistory = useCallback(async () => {
    if (!confirm("Clear all messages in this chat? This cannot be undone."))
      return;
    try {
      await fetch(`/api/chat/rooms/${room.id}/clear`, { method: "POST" });
      setMessages([]);
      onRefresh();
    } catch {
      // Silently fail
    }
  }, [room.id, onRefresh]);

  const displayName = room.name || "Chat";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="h-14 border-b flex items-center px-4 gap-3 shrink-0">
        <Avatar
          src={room.iconUrl}
          fallback={displayName}
          size="md"
          className="h-8 w-8"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium truncate">{displayName}</h3>
          <p className="text-xs text-muted-foreground">
            {room.participants.length} member
            {room.participants.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleClearHistory}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-1"
      >
        {hasMore && messages.length > 0 && (
          <div className="text-center py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-xs"
            >
              {loadingMore ? "Loading..." : "Load earlier messages"}
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            Loading messages...
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.senderId === currentStaffId;
          const showDateHeader =
            i === 0 || !isSameDay(msg.createdAt, messages[i - 1].createdAt);
          const showSender =
            i === 0 || messages[i - 1].senderId !== msg.senderId;

          return (
            <div key={msg.id}>
              {showDateHeader && (
                <div className="text-center py-2">
                  <span className="text-xs bg-muted px-3 py-1 rounded-full">
                    {formatDateHeader(msg.createdAt)}
                  </span>
                </div>
              )}
              <div
                className={`flex gap-2 ${
                  isMe ? "justify-end" : "justify-start"
                } ${showSender && i > 0 ? "mt-3" : "mt-0.5"}`}
              >
                {!isMe && showSender && (
                  <Avatar
                    src={msg.sender?.avatarUrl}
                    fallback={msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : "?"}
                    size="sm"
                    className="h-7 w-7 mt-1 shrink-0"
                  />
                )}
                {!isMe && !showSender && <div className="w-7 shrink-0" />}
                <div
                  className={`max-w-[70%] ${
                    isMe ? "items-end" : "items-start"
                  }`}
                >
                  {!isMe && showSender && (
                    <p className="text-xs text-muted-foreground mb-0.5 ml-1">
                      {msg.sender?.firstName} {msg.sender?.lastName}
                    </p>
                  )}
                  <div
                    className={`rounded-lg px-3 py-2 text-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.mediaType === "image" && msg.mediaUrl && (
                      <img
                        src={msg.mediaUrl}
                        alt="Shared image"
                        className="rounded max-w-full max-h-60 mb-1 cursor-pointer"
                        onClick={() =>
                          window.open(msg.mediaUrl!, "_blank")
                        }
                      />
                    )}
                    {msg.mediaType === "voice" && msg.mediaUrl && (
                      <audio
                        controls
                        src={msg.mediaUrl}
                        className="max-w-full h-8"
                      />
                    )}
                    {msg.mediaType === "document" && msg.mediaUrl && (
                      <a
                        href={msg.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-blue-400 break-all"
                      >
                        📎 {msg.text || "Document"}
                      </a>
                    )}
                    {msg.text && msg.mediaType !== "document" && (
                      <p className="whitespace-pre-wrap break-words">
                        {msg.text}
                      </p>
                    )}
                  </div>
                  <p
                    className={`text-[10px] text-muted-foreground mt-0.5 ${
                      isMe ? "text-right mr-1" : "ml-1"
                    }`}
                  >
                    {formatMessageTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {showScrollBtn && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <Button
            size="icon"
            className="h-8 w-8 rounded-full shadow-lg"
            onClick={() => scrollToBottom(true)}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="border-t p-3 shrink-0">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileUpload}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              className="pr-10"
            />
          </div>
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {uploadingFile && (
          <p className="text-xs text-muted-foreground mt-1">
            Uploading file...
          </p>
        )}
      </div>
    </div>
  );
}
