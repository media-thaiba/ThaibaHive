import { jwtVerify } from "jose";
import { getJwtSecretBytes } from "@thaiba/auth/config";
import type { SessionPayload } from "@thaiba/auth";
import { chatPubSub, ChatSubscriber, ChatEvent } from "./pubsub-broker";
import { chatPresence } from "./presence-engine";
import { db } from "@/db";
import { chatMembers, chatChannelMessages, chatReceipts } from "@thaiba/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface WSClientMessage {
  type: "ping" | "join" | "leave" | "typing:start" | "typing:stop" | "message" | "read";
  channelId?: string;
  clientMessageId?: string;
  content?: string;
  messageType?: "text" | "image" | "file";
  replyToId?: string;
  attachmentUrl?: string;
  messageIds?: string[];
}

export interface WSConnection {
  connectionId: string;
  session: SessionPayload;
  subscriber: ChatSubscriber;
  send: (data: string) => void;
  lastPingAt: number;
}

export class ChatWebSocketHandler {
  private static instance: ChatWebSocketHandler;
  private connections = new Map<string, WSConnection>();

  private constructor() {}

  public static getInstance(): ChatWebSocketHandler {
    if (!ChatWebSocketHandler.instance) {
      ChatWebSocketHandler.instance = new ChatWebSocketHandler();
    }
    return ChatWebSocketHandler.instance;
  }

  /**
   * Authenticate token during WebSocket handshake
   */
  public async authenticateHandshake(token: string): Promise<SessionPayload | null> {
    try {
      const { payload } = await jwtVerify(token, getJwtSecretBytes("session"));
      if (!payload.staffId || typeof payload.staffId !== "string") {
        return null;
      }
      return {
        staffId: payload.staffId,
        email: typeof payload.email === "string" ? payload.email : "",
        role: typeof payload.role === "string" ? payload.role : "staff",
        employeeId: typeof payload.employeeId === "string" ? payload.employeeId : "",
        name: typeof payload.name === "string" ? payload.name : "",
        tokenVersion: typeof payload.tokenVersion === "number" ? payload.tokenVersion : 0,
        institutionId: typeof payload.institutionId === "string" ? payload.institutionId : null,
      };
    } catch {
      return null;
    }
  }

  /**
   * Register a newly established WebSocket connection
   */
  public registerConnection(
    connectionId: string,
    session: SessionPayload,
    sendRaw: (data: string) => void
  ): WSConnection {
    const subscriber: ChatSubscriber = {
      staffId: session.staffId,
      institutionId: session.institutionId || "",
      isAlive: true,
      send: (event: ChatEvent) => {
        sendRaw(JSON.stringify(event));
      },
    };

    const conn: WSConnection = {
      connectionId,
      session,
      subscriber,
      send: sendRaw,
      lastPingAt: Date.now(),
    };

    this.connections.set(connectionId, conn);
    chatPubSub.registerUserConnection(subscriber);
    chatPresence.recordHeartbeat(session.staffId, session.institutionId || "", "online");

    // Send connected ACK frame
    sendRaw(
      JSON.stringify({
        type: "connected",
        connectionId,
        staffId: session.staffId,
        timestamp: new Date().toISOString(),
      })
    );

    return conn;
  }

  /**
   * Handle incoming framed message from a connected client
   */
  public async handleMessage(connectionId: string, rawMessage: string): Promise<void> {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    let payload: WSClientMessage;
    try {
      payload = JSON.parse(rawMessage);
    } catch {
      conn.send(JSON.stringify({ type: "error", message: "Invalid JSON format" }));
      return;
    }

    const { staffId } = conn.session;
    const institutionId = conn.session.institutionId || "";

    switch (payload.type) {
      case "ping":
        conn.lastPingAt = Date.now();
        chatPresence.recordHeartbeat(staffId, institutionId, "online");
        conn.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        break;

      case "join":
        if (payload.channelId) {
          // Verify user is a member of this channel within the institution
          const membership = await db
            .select({ id: chatMembers.id })
            .from(chatMembers)
            .where(
              and(
                eq(chatMembers.channelId, payload.channelId),
                eq(chatMembers.staffId, staffId)
              )
            )
            .get();

          if (membership) {
            chatPubSub.subscribeChannel(payload.channelId, conn.subscriber);
            conn.send(
              JSON.stringify({
                type: "channel:joined",
                channelId: payload.channelId,
                timestamp: new Date().toISOString(),
              })
            );
          } else {
            conn.send(
              JSON.stringify({
                type: "error",
                message: "Not authorized to join this channel",
                channelId: payload.channelId,
              })
            );
          }
        }
        break;

      case "leave":
        if (payload.channelId) {
          chatPubSub.unsubscribeChannel(payload.channelId, conn.subscriber);
          conn.send(
            JSON.stringify({
              type: "channel:left",
              channelId: payload.channelId,
              timestamp: new Date().toISOString(),
            })
          );
        }
        break;

      case "typing:start":
        if (payload.channelId) {
          chatPresence.setTyping(staffId, payload.channelId, institutionId, true);
        }
        break;

      case "typing:stop":
        if (payload.channelId) {
          chatPresence.setTyping(staffId, payload.channelId, institutionId, false);
        }
        break;

      case "message":
        if (payload.channelId && payload.content?.trim()) {
          const messageId = randomUUID();
          const now = new Date().toISOString();

          // Verify membership before saving
          const isMember = await db
            .select({ id: chatMembers.id })
            .from(chatMembers)
            .where(
              and(
                eq(chatMembers.channelId, payload.channelId),
                eq(chatMembers.staffId, staffId)
              )
            )
            .get();

          if (!isMember) {
            conn.send(
              JSON.stringify({
                type: "error",
                message: "Forbidden: Not a member of channel",
                channelId: payload.channelId,
              })
            );
            return;
          }

          const messageRecord = {
            id: messageId,
            institutionId,
            channelId: payload.channelId,
            senderId: staffId,
            clientMessageId: payload.clientMessageId || null,
            content: payload.content.trim(),
            type: payload.messageType || "text",
            replyToId: payload.replyToId || null,
            attachmentUrl: payload.attachmentUrl || null,
            editedAt: null,
            deletedAt: null,
            createdAt: now,
          };

          await db.insert(chatChannelMessages).values(messageRecord);

          // Broadcast message:new to all channel members
          const event: ChatEvent = {
            type: "message:new",
            channelId: payload.channelId,
            senderId: staffId,
            institutionId,
            payload: messageRecord,
            timestamp: now,
          };
          chatPubSub.publishToChannel(payload.channelId, event);

          // Send message:ack to sender
          conn.send(
            JSON.stringify({
              type: "message:ack",
              clientMessageId: payload.clientMessageId,
              id: messageId,
              createdAt: now,
            })
          );
        }
        break;

      case "read":
        if (payload.messageIds && payload.messageIds.length > 0) {
          const now = new Date().toISOString();
          for (const msgId of payload.messageIds) {
            await db
              .insert(chatReceipts)
              .values({
                id: randomUUID(),
                messageId: msgId,
                staffId,
                status: "read",
                deliveredAt: now,
                readAt: now,
              })
              .onConflictDoUpdate({
                target: [chatReceipts.messageId, chatReceipts.staffId],
                set: { status: "read", readAt: now },
              });

            // Look up channelId for the message to broadcast receipt update
            const msg = await db
              .select({ channelId: chatChannelMessages.channelId })
              .from(chatChannelMessages)
              .where(eq(chatChannelMessages.id, msgId))
              .get();

            if (msg) {
              const receiptEvent: ChatEvent = {
                type: "receipt:update",
                channelId: msg.channelId,
                senderId: staffId,
                institutionId,
                payload: { messageId: msgId, staffId, status: "read", readAt: now },
                timestamp: now,
              };
              chatPubSub.publishToChannel(msg.channelId, receiptEvent);
            }
          }
        }
        break;
    }
  }

  /**
   * Handle connection close
   */
  public handleDisconnect(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    const { staffId } = conn.session;
    const institutionId = conn.session.institutionId || "";

    chatPubSub.unregisterUserConnection(conn.subscriber);
    this.connections.delete(connectionId);

    if (!chatPubSub.isUserOnline(staffId)) {
      chatPresence.setUserOffline(staffId, institutionId);
    }
  }

  public getConnection(connectionId: string): WSConnection | undefined {
    return this.connections.get(connectionId);
  }

  public reset(): void {
    this.connections.clear();
  }
}

export const chatWsHandler = ChatWebSocketHandler.getInstance();
