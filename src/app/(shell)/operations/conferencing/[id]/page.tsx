"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { ensureArray } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface ParticipantSession {
  id: string;
  peerId: string;
  participantUserId: string;
  role: string;
  audioMuted: boolean;
  videoMuted: boolean;
  connectionQuality?: string;
  joinedAt: string;
}

interface RoomDetails {
  id: string;
  roomName: string;
  roomType: string;
  maxParticipants: number;
  isE2eeEnabled: boolean;
  status: string;
}

export default function ConferencingRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;
  const router = useRouter();
  const { staff } = useAuth();
  const instId = staff?.institutionId;

  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [participants, setParticipants] = useState<ParticipantSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local media controls
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [currentEpoch, setCurrentEpoch] = useState<number>(1);
  const [fingerprint, setFingerprint] = useState<string>("");
  const [isFingerprintModalOpen, setIsFingerprintModalOpen] = useState(false);
  const [myPeerId, setMyPeerId] = useState<string>("");
  const [isLocked, setIsLocked] = useState(false);

  // Load initial room data
  const loadRoom = useCallback(() => {
    const qs = instId ? `?institutionId=${encodeURIComponent(instId)}` : "";
    fetch(`/api/streaming/rooms/${roomId}${qs}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setRoom(data.room);
        setParticipants(ensureArray(data.activeSessions));
        if (data.currentEpoch) setCurrentEpoch(data.currentEpoch);
        setLoading(false);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load conference room");
        setLoading(false);
      });
  }, [roomId, instId]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  // Join room and connect SSE
  useEffect(() => {
    if (!roomId) return;

    let isCancelled = false;
    let eventSource: EventSource | null = null;
    const qs = instId ? `?institutionId=${encodeURIComponent(instId)}` : "";

    // Join room endpoint
    fetch(`/api/streaming/rooms/${roomId}/join${qs}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((res) => res.json())
      .then((data) => {
        // Component unmounted (navigated away) while /join was in flight —
        // do not touch state or open an orphaned EventSource.
        if (isCancelled) return;
        if (data.success && data.session) {
          setMyPeerId(data.session.peerId);
          if (data.epoch) setCurrentEpoch(data.epoch);
          if (data.fingerprint) setFingerprint(data.fingerprint);

          // Establish SSE connection for real-time signaling
          const sseQs = `peerId=${encodeURIComponent(data.session.peerId)}${instId ? `&institutionId=${encodeURIComponent(instId)}` : ""}`;
          eventSource = new EventSource(`/api/streaming/rooms/${roomId}/events?${sseQs}`);

          eventSource.addEventListener("signal", (e) => {
            try {
              const signal = JSON.parse(e.data);
              if (signal.signalType === "peer_joined") {
                const payload = JSON.parse(signal.payloadJson || "{}");
                if (payload.epoch) setCurrentEpoch(payload.epoch);
                loadRoom();
              } else if (signal.signalType === "peer_left") {
                const payload = JSON.parse(signal.payloadJson || "{}");
                if (payload.action === "meeting_ended") {
                  router.push("/operations/conferencing");
                }
                loadRoom();
              } else if (signal.signalType === "room_lock") {
                const payload = JSON.parse(signal.payloadJson || "{}");
                setIsLocked(payload.isLocked);
              }
            } catch {
              // Ignore parse errors
            }
          });
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [roomId, loadRoom, router, instId]);

  const handleLeave = async () => {
    try {
      const qs = instId ? `?institutionId=${encodeURIComponent(instId)}` : "";
      await fetch(`/api/streaming/rooms/${roomId}/leave${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId: myPeerId }),
      });
    } catch {
      // Ignore leave errors
    }
    router.push("/operations/conferencing");
  };

  const handleModerate = async (action: "lock_room" | "unlock_room" | "end_room", targetPeerId?: string) => {
    try {
      const qs = instId ? `?institutionId=${encodeURIComponent(instId)}` : "";
      await fetch(`/api/streaming/rooms/${roomId}/manage${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, targetPeerId }),
      });
      loadRoom();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-4 max-w-7xl">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Alert variant="error">
          <p>{error || "Room not found"}</p>
        </Alert>
        <Button className="mt-4" onClick={() => router.push("/operations")}>Back to Operations</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Conference Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">{room.roomName}</h1>
          <Badge variant={room.status === "ACTIVE" ? "success" : "secondary"}>
            {room.status}
          </Badge>
          {isLocked && <Badge variant="destructive">LOCKED</Badge>}
        </div>

        <div className="flex items-center gap-3">
          {/* E2EE Verification Badge */}
          {room.isE2eeEnabled && (
            <Button
              size="sm"
              variant="outline"
              className="text-emerald-400 border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/40"
              onClick={() => setIsFingerprintModalOpen(true)}
            >
              🔒 E2EE Active (Epoch {currentEpoch})
            </Button>
          )}

          <Badge variant="outline" className="text-zinc-400">
            {participants.length + 1} / {room.maxParticipants} Active
          </Badge>
        </div>
      </div>

      {/* Main Video Tile Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 h-full">
          {/* Self Video Tile */}
          <Card className="bg-zinc-900 border-zinc-800 relative flex flex-col items-center justify-center min-h-[220px]">
            <div className="w-20 h-20 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-2xl font-bold">
              You
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <span className="text-xs bg-black/60 px-2 py-1 rounded text-zinc-200">
                You (Host / Self)
              </span>
              {isAudioMuted && <span className="text-xs bg-red-900/60 text-red-200 px-1.5 py-0.5 rounded">Muted</span>}
              {isVideoMuted && <span className="text-xs bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">Cam Off</span>}
            </div>
          </Card>

          {/* Remote Participant Tiles */}
          {participants.map((p) => (
            <Card key={p.id} className="bg-zinc-900 border-zinc-800 relative flex flex-col items-center justify-center min-h-[220px]">
              <div className="w-20 h-20 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-2xl font-bold">
                {p.participantUserId.slice(0, 2).toUpperCase()}
              </div>
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <span className="text-xs bg-black/60 px-2 py-1 rounded text-zinc-200">
                  {p.participantUserId}
                </span>
                <Badge variant="secondary" className="text-[10px] py-0 px-1">
                  {p.role}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="flex items-center justify-center gap-4 px-6 py-4 bg-zinc-900 border-t border-zinc-800">
        <Button
          variant={isAudioMuted ? "destructive" : "secondary"}
          onClick={() => setIsAudioMuted(!isAudioMuted)}
        >
          {isAudioMuted ? "Unmute Mic" : "Mute Mic"}
        </Button>

        <Button
          variant={isVideoMuted ? "destructive" : "secondary"}
          onClick={() => setIsVideoMuted(!isVideoMuted)}
        >
          {isVideoMuted ? "Start Camera" : "Stop Camera"}
        </Button>

        <Button
          variant={isScreenSharing ? "default" : "secondary"}
          onClick={() => setIsScreenSharing(!isScreenSharing)}
        >
          {isScreenSharing ? "Stop Share" : "Share Screen"}
        </Button>

        {isLocked ? (
          <Button variant="outline" onClick={() => handleModerate("unlock_room")}>
            Unlock Room
          </Button>
        ) : (
          <Button variant="outline" onClick={() => handleModerate("lock_room")}>
            Lock Room
          </Button>
        )}

        <Button variant="destructive" onClick={handleLeave}>
          Leave Room
        </Button>
      </div>

      {/* E2EE Key Fingerprint Modal */}
      <Dialog open={isFingerprintModalOpen} onOpenChange={setIsFingerprintModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>E2EE Security Fingerprint</DialogTitle>
            <DialogDescription>
              Audio and video frames are encrypted before leaving your device using WebRTC Insertable Streams and P-256 ECDH keys.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-center font-mono text-lg tracking-wider font-semibold border">
              {fingerprint}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Compare this fingerprint with other attendees out-of-band to verify end-to-end cryptographic confidentiality. Current Epoch: {currentEpoch}.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsFingerprintModalOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
