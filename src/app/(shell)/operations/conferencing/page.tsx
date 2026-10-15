"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { ensureArray } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface ConferenceRoom {
  id: string;
  roomName: string;
  hostUserId: string;
  roomType: string;
  maxParticipants: number;
  hasPasscode: boolean;
  isE2eeEnabled: boolean;
  status: string;
  createdAt: string;
}

export default function ConferencingDirectoryPage() {
  const router = useRouter();
  const { staff } = useAuth();
  const instId = staff?.institutionId;

  const [rooms, setRooms] = useState<ConferenceRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create room modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    roomName: "",
    roomType: "MEETING",
    maxParticipants: 50,
    passcode: "",
    isE2eeEnabled: true,
  });

  const loadRooms = useCallback(() => {
    setLoading(true);
    const qs = instId ? `?institutionId=${encodeURIComponent(instId)}` : "";
    fetch(`/api/streaming/rooms${qs}`, {
      headers: instId ? { "x-institution-id": instId } : undefined,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setRooms(ensureArray(data.rooms));
        setLoading(false);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load conference rooms");
        setLoading(false);
      });
  }, [instId]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleCreateRoom = async () => {
    setIsSubmitting(true);
    try {
      const qs = instId ? `?institutionId=${encodeURIComponent(instId)}` : "";
      const res = await fetch(`/api/streaming/rooms${qs}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(instId ? { "x-institution-id": instId } : {}),
        },
        body: JSON.stringify({
          roomName: formData.roomName,
          roomType: formData.roomType,
          maxParticipants: Number(formData.maxParticipants) || 50,
          passcode: formData.passcode || undefined,
          isE2eeEnabled: formData.isE2eeEnabled,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create conference room");
      }

      setIsCreateModalOpen(false);
      setFormData({
        roomName: "",
        roomType: "MEETING",
        maxParticipants: 50,
        passcode: "",
        isE2eeEnabled: true,
      });

      if (data.room?.id) {
        router.push(`/operations/conferencing/${data.room.id}`);
      } else {
        loadRooms();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Room creation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campus Video Conferencing</h1>
          <p className="text-muted-foreground mt-1">
            Real-time multi-party meetings, lecture streaming, and end-to-end encrypted rooms.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadRooms} disabled={loading}>
            Refresh
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            Create Room
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          <p>{error}</p>
        </Alert>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : rooms.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle>No Active Conference Rooms</CardTitle>
            <CardDescription>
              There are currently no active meetings or classrooms in this campus. Create one to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsCreateModalOpen(true)}>Create First Room</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <Card key={room.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={room.status === "ACTIVE" ? "success" : "secondary"}>
                    {room.status}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {room.isE2eeEnabled && <Badge variant="info">E2EE</Badge>}
                    {room.hasPasscode && <Badge variant="warning">Passcode</Badge>}
                  </div>
                </div>
                <CardTitle className="mt-2 text-xl">{room.roomName}</CardTitle>
                <CardDescription>
                  Type: {room.roomType} · Max Capacity: {room.maxParticipants}
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-2 border-t flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-mono">
                  {room.id.slice(0, 14)}...
                </span>
                <Button
                  size="sm"
                  onClick={() => router.push(`/operations/conferencing/${room.id}`)}
                >
                  Join Room
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Conference Room</DialogTitle>
            <DialogDescription>
              Configure room parameters and launch an interactive video room.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="room-name">Room Name</Label>
              <Input
                id="room-name"
                placeholder="e.g. Physics Dept Weekly Sync"
                value={formData.roomName}
                onChange={(e) => setFormData({ ...formData, roomName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="room-type">Room Type</Label>
              <Input
                id="room-type"
                placeholder="MEETING, WEBINAR, or CLASSROOM"
                value={formData.roomType}
                onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="max-cap">Max Participants</Label>
              <Input
                id="max-cap"
                type="number"
                min="2"
                max="200"
                value={formData.maxParticipants}
                onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value, 10) || 50 })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="passcode">Access Passcode (Optional)</Label>
              <Input
                id="passcode"
                type="password"
                placeholder="Leave blank for open access"
                value={formData.passcode}
                onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRoom}
              disabled={!formData.roomName.trim() || isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Launch Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
