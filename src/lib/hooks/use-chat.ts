"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatSender {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  designation?: string | null;
}

export interface ChatMessageItem {
  id: string;
  institutionId?: string;
  channelId: string;
  senderId: string;
  clientMessageId?: string | null;
  content: string;
  type: string;
  replyToId?: string | null;
  attachmentUrl?: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  sender?: ChatSender;
  status?: "sending" | "sent" | "delivered" | "read" | "failed";
}

export interface ChatChannelItem {
  id: string;
  institutionId: string;
  name: string | null;
  type: "direct" | "group" | "announcement";
  createdById: string;
  avatarUrl?: string | null;
  isActive: boolean;
  role?: string;
  lastReadAt?: string | null;
  mutedUntil?: string | null;
  latestMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    type: string;
  } | null;
  unreadCount: number;
}

export function useChat() {
  const { staff } = useAuth();
  const [channels, setChannels] = useState<ChatChannelItem[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, ChatMessageItem[]>>({});
  const [presence, setPresence] = useState<Record<string, "online" | "away" | "offline">>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);

  const sseRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef<number>(1000);

  // ─── Fetch Channels ───
  const fetchChannels = useCallback(async () => {
    try {
      setIsLoadingChannels(true);
      const res = await fetch("/api/chat/channels");
      if (res.ok) {
        const data = await res.json();
        const list: ChatChannelItem[] = data.channels || [];
        setChannels(list);
        if (!activeChannelId && list.length > 0) {
          setActiveChannelId(list[0].id);
        }
      }
    } catch {
      // Ignore error
    } finally {
      setIsLoadingChannels(false);
    }
  }, [activeChannelId]);

  // ─── Fetch Messages for Active Channel ───
  const fetchMessages = useCallback(async (channelId: string) => {
    if (!channelId) return;
    try {
      setIsLoadingMessages(true);
      const res = await fetch(`/api/chat/channels/${channelId}/messages?limit=50`);
      if (res.ok) {
        const data = await res.json();
        const msgs: ChatMessageItem[] = (data.messages || []).reverse();
        setMessagesByChannel((prev) => ({
          ...prev,
          [channelId]: msgs,
        }));
      }
    } catch {
      // Ignore error
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // ─── Fetch Presence ───
  const fetchPresence = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/presence");
      if (res.ok) {
        const data = await res.json();
        setPresence(data.presence || {});
      }
    } catch {
      // Ignore error
    }
  }, []);

  // ─── Mark Message(s) Read ───
  const markAsRead = useCallback(
    async (channelId: string, messageId: string) => {
      try {
        await fetch(`/api/chat/messages/${messageId}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIds: [messageId] }),
        });

        // Decrement channel unread count in local state
        setChannels((prev) =>
          prev.map((c) => (c.id === channelId ? { ...c, unreadCount: 0 } : c))
        );
      } catch {
        // Ignore error
      }
    },
    []
  );

  // ─── Send Message ───
  const sendMessage = useCallback(
    async (content: string, type: string = "text", replyToId?: string, attachmentUrl?: string) => {
      if (!activeChannelId || !content.trim()) return;

      const clientMessageId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const now = new Date().toISOString();

      const optimisticMessage: ChatMessageItem = {
        id: clientMessageId,
        channelId: activeChannelId,
        senderId: staff?.id || "",
        clientMessageId,
        content: content.trim(),
        type,
        replyToId: replyToId ?? null,
        attachmentUrl: attachmentUrl ?? null,
        createdAt: now,
        status: "sending",
        sender: {
          id: staff?.id || "",
          firstName: staff?.firstName || "Me",
          lastName: staff?.lastName || "",
          avatarUrl: staff?.avatarUrl || null,
        },
      };

      // Optimistic state insertion
      setMessagesByChannel((prev) => ({
        ...prev,
        [activeChannelId]: [...(prev[activeChannelId] || []), optimisticMessage],
      }));

      // Persist via REST API for guaranteed durability & receipts
      try {
        const res = await fetch(`/api/chat/channels/${activeChannelId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: content.trim(),
            type,
            clientMessageId,
            replyToId,
            attachmentUrl,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const serverMsg: ChatMessageItem = data.message;

          // Replace optimistic message with confirmed server message
          setMessagesByChannel((prev) => {
            const list = prev[activeChannelId] || [];
            return {
              ...prev,
              [activeChannelId]: list.map((m) =>
                m.clientMessageId === clientMessageId
                  ? { ...serverMsg, status: "sent" }
                  : m
              ),
            };
          });
        } else {
          // Mark optimistic message as failed
          setMessagesByChannel((prev) => {
            const list = prev[activeChannelId] || [];
            return {
              ...prev,
              [activeChannelId]: list.map((m) =>
                m.clientMessageId === clientMessageId
                  ? { ...m, status: "failed" }
                  : m
              ),
            };
          });
        }
      } catch {
        setMessagesByChannel((prev) => {
          const list = prev[activeChannelId] || [];
          return {
            ...prev,
            [activeChannelId]: list.map((m) =>
              m.clientMessageId === clientMessageId
                ? { ...m, status: "failed" }
                : m
            ),
          };
        });
      }
    },
    [activeChannelId, staff]
  );

  // ─── Dispatch Typing Indicator ───
  const sendTyping = useCallback((_isTyping: boolean) => {
    // No-op: typing is only broadcast server-side over the real-time transport.
    // There is no REST publish endpoint, and the previous WebSocket send path
    // never connected (see transport lifecycle below), so behavior is unchanged.
  }, []);

  // ─── Incoming Event Handler ───
  const handleChatEvent = useCallback(
    (event: any) => {
      if (!event || !event.type) return;

      if (event.type === "message:new" && event.payload) {
        const msg: ChatMessageItem = event.payload;
        const targetChannelId = event.channelId || msg.channelId;

        setMessagesByChannel((prev) => {
          const list = prev[targetChannelId] || [];
          // Deduplicate if already present by clientMessageId or id
          const exists = list.some(
            (m) =>
              m.id === msg.id ||
              (msg.clientMessageId && m.clientMessageId === msg.clientMessageId)
          );
          if (exists) {
            return {
              ...prev,
              [targetChannelId]: list.map((m) =>
                m.clientMessageId === msg.clientMessageId || m.id === msg.id
                  ? { ...msg, status: "delivered" }
                  : m
              ),
            };
          }
          return {
            ...prev,
            [targetChannelId]: [...list, { ...msg, status: "delivered" }],
          };
        });

        // Update channel latest message and unread count
        setChannels((prev) =>
          prev.map((c) => {
            if (c.id === targetChannelId) {
              const isCurrent = targetChannelId === activeChannelId;
              return {
                ...c,
                latestMessage: {
                  id: msg.id,
                  content: msg.content,
                  senderId: msg.senderId,
                  createdAt: msg.createdAt,
                  type: msg.type,
                },
                unreadCount: isCurrent ? 0 : c.unreadCount + 1,
              };
            }
            return c;
          })
        );
      } else if (event.type === "message:edit" && event.payload) {
        const msg: ChatMessageItem = event.payload;
        const targetChannelId = event.channelId || msg.channelId;
        setMessagesByChannel((prev) => {
          const list = prev[targetChannelId] || [];
          return {
            ...prev,
            [targetChannelId]: list.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)),
          };
        });
      } else if (event.type === "message:delete" && event.payload) {
        const { messageId, channelId: cid } = event.payload;
        const targetChannelId = event.channelId || cid;
        setMessagesByChannel((prev) => {
          const list = prev[targetChannelId] || [];
          return {
            ...prev,
            [targetChannelId]: list.map((m) =>
              m.id === messageId
                ? { ...m, content: "[Message deleted]", deletedAt: new Date().toISOString() }
                : m
            ),
          };
        });
      } else if (event.type === "typing:update" && event.payload) {
        const { channelId: cid, senderId, isTyping } = event.payload;
        if (senderId === staff?.id) return;
        setTypingUsers((prev) => {
          const current = prev[cid] || [];
          if (isTyping && !current.includes(senderId)) {
            return { ...prev, [cid]: [...current, senderId] };
          } else if (!isTyping && current.includes(senderId)) {
            return { ...prev, [cid]: current.filter((id) => id !== senderId) };
          }
          return prev;
        });
      } else if (event.type === "presence:update" && event.payload) {
        const { staffId: pid, status: pstatus } = event.payload;
        setPresence((prev) => ({ ...prev, [pid]: pstatus }));
      }
    },
    [activeChannelId, staff]
  );

  // ─── SSE Transport Lifecycle ───
  // The /api/chat/ws route is an HTTP simulation (POST/GET only, no WebSocket
  // upgrade handler), so a WS handshake can never succeed — attempting it only
  // produced a guaranteed browser console error on every load. SSE is the
  // real transport; reconnects use capped exponential backoff.
  useEffect(() => {
    if (!staff) return;

    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) return;
      try {
        const sse = new EventSource("/api/chat/sse");
        sseRef.current = sse;

        sse.onopen = () => {
          if (isUnmounted) return;
          setIsConnected(true);
          reconnectDelayRef.current = 1000;
        };

        sse.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            handleChatEvent(data);
          } catch {
            // Ignore parse errors
          }
        };

        sse.onerror = () => {
          sse.close();
          if (sseRef.current === sse) sseRef.current = null;
          if (isUnmounted) return;
          setIsConnected(false);
          scheduleReconnect();
        };
      } catch {
        scheduleReconnect();
      }
    };

    const scheduleReconnect = () => {
      if (reconnectTimeoutRef.current || isUnmounted) return;
      const delay = Math.min(reconnectDelayRef.current, 30_000);
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        reconnectDelayRef.current = delay * 2;
        connect();
      }, delay);
    };

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (sseRef.current) sseRef.current.close();
    };
  }, [staff, handleChatEvent]);

  // Initial loads
  useEffect(() => {
    if (!staff) return;
    fetchChannels();
    fetchPresence();
  }, [staff, fetchChannels, fetchPresence]);

  // Fetch messages when activeChannelId changes
  useEffect(() => {
    if (!activeChannelId) return;
    fetchMessages(activeChannelId);
  }, [activeChannelId, fetchMessages]);

  const totalUnreadCount = channels.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return {
    channels,
    activeChannelId,
    setActiveChannelId,
    messages: (activeChannelId ? messagesByChannel[activeChannelId] : []) || [],
    presence,
    typingUsers: (activeChannelId ? typingUsers[activeChannelId] : []) || [],
    isConnected,
    isLoadingChannels,
    isLoadingMessages,
    totalUnreadCount,
    sendMessage,
    sendTyping,
    markAsRead,
    refreshChannels: fetchChannels,
    refreshMessages: () => activeChannelId && fetchMessages(activeChannelId),
  };
}
