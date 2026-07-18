"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatSidebar } from "./chat-sidebar";
import { ChatWindow } from "./chat-window";
import { AddUserModal } from "./add-user-modal";

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
};

type Participant = {
  id: string;
  roomId: string;
  staffId: string;
  role: string;
  addedById: string | null;
  lastReadAt: string | null;
  createdAt: string;
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

type ChatLayoutProps = {
  staff: StaffMember[];
};

export function ChatLayout({ staff }: ChatLayoutProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      const data = await fetch("/api/chat/rooms").then((r) => r.json());
      setRooms(Array.isArray(data.rooms) ? data.rooms : []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.staffId) setCurrentStaffId(data.staffId);
      })
      .catch(() => {});
  }, []);

  const handleCreateRoom = useCallback(
    async (participantIds: string[], name?: string, isDm?: boolean) => {
      try {
        const res = await fetch("/api/chat/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantIds,
            name: isDm ? undefined : name,
            isDirectMessage: isDm,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setActiveRoomId(data.room.id);
          setShowNewChat(false);
          fetchRooms();
        }
      } catch {
        // Silently fail
      }
    },
    [fetchRooms]
  );

  const handleRoomUpdate = useCallback(() => {
    fetchRooms();
  }, [fetchRooms]);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || null;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden border rounded-lg">
      <ChatSidebar
        rooms={rooms}
        activeRoomId={activeRoomId}
        onSelectRoom={setActiveRoomId}
        onNewChat={() => setShowNewChat(true)}
        loading={loading}
        currentStaffId={currentStaffId}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {activeRoom ? (
          <ChatWindow
            room={activeRoom}
            onRefresh={handleRoomUpdate}
            currentStaffId={currentStaffId}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm mt-1">
                Choose from the sidebar or start a new chat
              </p>
            </div>
          </div>
        )}
      </div>
      {showNewChat && (
        <AddUserModal
          staff={staff}
          currentStaffId={currentStaffId}
          existingRooms={rooms}
          onClose={() => setShowNewChat(false)}
          onCreateRoom={handleCreateRoom}
        />
      )}
    </div>
  );
}
