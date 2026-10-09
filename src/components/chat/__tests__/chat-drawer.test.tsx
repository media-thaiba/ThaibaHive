import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChatDrawer } from "../chat-drawer";
import { ReadReceiptBadge } from "../read-receipt-badge";
import { MessageInput } from "../message-input";
import { ChannelList } from "../channel-list";

// Mock AuthContext
jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    staff: {
      id: "staff-me-123",
      name: "Current User",
      email: "user@thaiba.dev",
      role: "staff",
    },
  }),
}));

// Mock useChat hook
const mockSendMessage = jest.fn().mockResolvedValue(undefined);
const mockSendTyping = jest.fn();
const mockMarkAsRead = jest.fn().mockResolvedValue(undefined);
const mockSetActiveChannelId = jest.fn();

jest.mock("@/lib/hooks/use-chat", () => ({
  useChat: () => ({
    channels: [
      {
        id: "chan-1",
        institutionId: "inst-1",
        name: "General",
        type: "group",
        createdById: "staff-1",
        isActive: true,
        unreadCount: 2,
        latestMessage: {
          id: "m-1",
          content: "Welcome everyone!",
          senderId: "staff-1",
          createdAt: new Date().toISOString(),
          type: "text",
        },
      },
      {
        id: "chan-2",
        institutionId: "inst-1",
        name: "Direct Colleague",
        type: "direct",
        createdById: "staff-2",
        isActive: true,
        unreadCount: 0,
      },
    ],
    activeChannelId: "chan-1",
    setActiveChannelId: mockSetActiveChannelId,
    messages: [
      {
        id: "msg-101",
        channelId: "chan-1",
        senderId: "staff-me-123",
        content: "Hello team!",
        type: "text",
        createdAt: new Date().toISOString(),
        status: "read",
        sender: { id: "staff-me-123", firstName: "Current", lastName: "User" },
      },
      {
        id: "msg-102",
        channelId: "chan-1",
        senderId: "staff-other-456",
        content: "Hey there!",
        type: "text",
        createdAt: new Date().toISOString(),
        sender: { id: "staff-other-456", firstName: "Other", lastName: "Person" },
      },
    ],
    presence: { "staff-other-456": "online" },
    typingUsers: [],
    isConnected: true,
    isLoadingChannels: false,
    isLoadingMessages: false,
    totalUnreadCount: 2,
    sendMessage: mockSendMessage,
    sendTyping: mockSendTyping,
    markAsRead: mockMarkAsRead,
  }),
}));

describe("Web Chat Center Components", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  it("renders ChatDrawer with channels, active message thread and message input", () => {
    render(<ChatDrawer open={true} onOpenChange={jest.fn()} />);

    expect(screen.getByText("ThaibaHive Chat")).toBeInTheDocument();
    expect(screen.getAllByText("General").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Hello team!")).toBeInTheDocument();
    expect(screen.getByText("Hey there!")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Message #General.../i)).toBeInTheDocument();
  });

  it("renders ReadReceiptBadge correctly across statuses", () => {
    const { rerender } = render(<ReadReceiptBadge status="read" />);
    expect(screen.getByTitle("Read")).toBeInTheDocument();

    rerender(<ReadReceiptBadge status="delivered" />);
    expect(screen.getByTitle("Delivered")).toBeInTheDocument();

    rerender(<ReadReceiptBadge status="sent" />);
    expect(screen.getByTitle("Sent")).toBeInTheDocument();

    rerender(<ReadReceiptBadge status="sending" />);
    expect(screen.getByTitle("Sending...")).toBeInTheDocument();

    rerender(<ReadReceiptBadge status="failed" />);
    expect(screen.getByTitle("Failed to send")).toBeInTheDocument();
  });

  it("handles message submission from MessageInput", async () => {
    const onSend = jest.fn().mockResolvedValue(undefined);
    render(<MessageInput onSendMessage={onSend} />);

    const textarea = screen.getByRole("textbox", { name: "Message text" });
    const sendButton = screen.getByRole("button", { name: "Send message" });

    fireEvent.change(textarea, { target: { value: "A new message" } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith("A new message", "text", undefined);
    });
  });

  it("renders ChannelList with unread badges and channel categories", () => {
    const channels = [
      {
        id: "c-1",
        institutionId: "inst-1",
        name: "Announcements",
        type: "announcement" as const,
        createdById: "admin",
        isActive: true,
        unreadCount: 5,
      },
      {
        id: "c-2",
        institutionId: "inst-1",
        name: "General Staff",
        type: "group" as const,
        createdById: "admin",
        isActive: true,
        unreadCount: 0,
      },
    ];

    const onSelect = jest.fn();
    render(<ChannelList channels={channels} activeChannelId="c-1" onSelectChannel={onSelect} />);

    expect(screen.getAllByText("Announcements").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("General Staff")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    fireEvent.click(screen.getByText("General Staff"));
    expect(onSelect).toHaveBeenCalledWith("c-2");
  });
});
