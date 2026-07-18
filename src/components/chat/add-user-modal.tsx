"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { PresenceDot } from "@/components/ui/presence-dot";
import { X, Search, MessageSquare, Users } from "lucide-react";
import { usePresence } from "@/hooks/usePresence";

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
};

type Room = {
  id: string;
  name: string | null;
  participants: { staffId: string }[];
};

type AddUserModalProps = {
  staff: StaffMember[];
  currentStaffId: string | null;
  existingRooms: Room[];
  onClose: () => void;
  onCreateRoom: (
    participantIds: string[],
    name?: string,
    isDm?: boolean
  ) => void;
};

export function AddUserModal({
  staff,
  currentStaffId,
  existingRooms,
  onClose,
  onCreateRoom,
}: AddUserModalProps) {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"dm" | "group">("dm");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const { getPresence } = usePresence();

  const filteredStaff = staff.filter(
    (s) =>
      s.id !== currentStaffId &&
      (`${s.firstName} ${s.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
        s.role.toLowerCase().includes(search.toLowerCase()))
  );

  const handleToggleStaff = (id: string) => {
    if (mode === "dm") {
      setSelectedIds([id]);
    } else {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    }
  };

  const handleCreate = () => {
    if (selectedIds.length === 0) return;
    if (mode === "dm") {
      onCreateRoom(selectedIds, undefined, true);
    } else {
      onCreateRoom(selectedIds, groupName || "Group Chat", false);
    }
  };

  const findExistingDm = (staffId: string): Room | undefined => {
    return existingRooms.find((r) => {
      if (r.name !== null) return false;
      const participantIds = r.participants.map((p) => p.staffId);
      return (
        participantIds.includes(staffId) &&
        participantIds.includes(currentStaffId!) &&
        participantIds.length === 2
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">New Conversation</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-3 border-b flex gap-2">
          <Button
            variant={mode === "dm" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setMode("dm");
              setSelectedIds([]);
            }}
            className="flex-1"
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Direct Message
          </Button>
          <Button
            variant={mode === "group" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("group")}
            className="flex-1"
          >
            <Users className="h-4 w-4 mr-1" />
            Group Chat
          </Button>
        </div>

        {mode === "group" && (
          <div className="p-3 border-b">
            <Input
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
        )}

        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {filteredStaff.map((s) => {
            const isSelected = selectedIds.includes(s.id);
            const existingDm = findExistingDm(s.id);
            return (
              <button
                key={s.id}
                onClick={() => handleToggleStaff(s.id)}
                disabled={mode === "dm" && !!existingDm}
                className={`w-full text-left p-2 flex items-center gap-3 rounded-md transition-colors ${
                  isSelected
                    ? "bg-primary/10"
                    : "hover:bg-muted/50"
                } ${mode === "dm" && existingDm ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="relative">
                  <Avatar
                    src={s.avatarUrl}
                    fallback={`${s.firstName} ${s.lastName}`}
                    size="md"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <PresenceDot
                      online={getPresence(s.id)?.online ?? false}
                      status={getPresence(s.id)?.status ?? "active"}
                    />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {s.firstName} {s.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {s.role.replace("_", " ")}
                  </p>
                </div>
                {isSelected && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <svg
                      className="h-3 w-3 text-primary-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
                {mode === "dm" && existingDm && (
                  <span className="text-xs text-muted-foreground">
                    Exists
                  </span>
                )}
              </button>
            );
          })}
          {filteredStaff.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              No staff found
            </p>
          )}
        </div>

        <div className="p-3 border-t">
          <Button
            className="w-full"
            disabled={
              selectedIds.length === 0 ||
              (mode === "group" && !groupName.trim())
            }
            onClick={handleCreate}
          >
            {mode === "dm" ? "Start Conversation" : "Create Group"}
          </Button>
        </div>
      </div>
    </div>
  );
}
