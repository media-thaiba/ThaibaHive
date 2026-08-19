"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface NegotiationSession {
  id: string;
  sessionId: string;
  agentId: string;
  status: string;
  createdAt: string;
  resourceId?: string;
  bids?: Array<{ agentId: string; amount: number; timestamp: string }>;
}

interface NegotiationTrackerProps {
  sessions: NegotiationSession[];
  onTriggerEscalation?: (sessionId: string) => void;
}

const STATIC_SEED_TIME = 1718000000000;

const DEFAULT_SESSIONS: NegotiationSession[] = [
  {
    id: "ns1",
    sessionId: "sess_compaction_001",
    agentId: "compaction_agent",
    status: "active",
    createdAt: new Date(STATIC_SEED_TIME).toISOString(),
    resourceId: "crdt_compaction_lock",
    bids: [
      { agentId: "node_north_writer", amount: 120, timestamp: new Date(STATIC_SEED_TIME).toISOString() },
      { agentId: "node_south_writer", amount: 150, timestamp: new Date(STATIC_SEED_TIME).toISOString() },
    ],
  },
  {
    id: "ns2",
    sessionId: "sess_exam_lock_002",
    agentId: "exam_scheduler_agent",
    status: "deadlocked",
    createdAt: new Date(STATIC_SEED_TIME - 60000).toISOString(),
    resourceId: "examination_db_transaction",
    bids: [
      { agentId: "local_agent_01", amount: 80, timestamp: new Date(STATIC_SEED_TIME).toISOString() },
      { agentId: "local_agent_02", amount: 90, timestamp: new Date(STATIC_SEED_TIME).toISOString() },
    ],
  },
];

export const NegotiationTracker: React.FC<NegotiationTrackerProps> = ({ sessions, onTriggerEscalation }) => {
  const [selectedSession, setSelectedSession] = useState<NegotiationSession | null>(null);

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "completed":
        return "success";
      case "deadlocked":
      case "failed":
        return "destructive";
      case "escalated":
        return "warning";
      default:
        return "secondary";
    }
  };

  const displaySessions = sessions.length > 0 ? sessions : DEFAULT_SESSIONS;

  return (
    <Card className="col-span-3 border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center justify-between">
          Autonomic Negotiation Sessions
          <Badge variant="info">Live Tracking</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session ID</TableHead>
                <TableHead>Initiator</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displaySessions.map((session) => (
                <TableRow key={session.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs">{session.sessionId}</TableCell>
                  <TableCell>{session.agentId}</TableCell>
                  <TableCell className="font-mono text-xs">{session.resourceId || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(session.status)}>{session.status.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>{new Date(session.createdAt).toLocaleTimeString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedSession(session)}>
                      View Bids
                    </Button>
                    {session.status === "deadlocked" && onTriggerEscalation && (
                      <Button variant="destructive" size="sm" onClick={() => onTriggerEscalation(session.sessionId)}>
                        Escalate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        {selectedSession && (
          <DialogContent className="sm:max-w-md border-border bg-card">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Negotiation Auction Bids
                <Badge variant={getStatusVariant(selectedSession.status)}>{selectedSession.status.toUpperCase()}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm text-foreground">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground font-semibold">Resource ID:</span>
                <span className="font-mono">{selectedSession.resourceId || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold block mb-2">Bids Log:</span>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {selectedSession.bids && selectedSession.bids.length > 0 ? (
                    selectedSession.bids.map((bid, i) => (
                      <div key={i} className="flex justify-between bg-muted/30 p-2 rounded text-xs font-mono">
                        <span>{bid.agentId}</span>
                        <span className="text-info font-bold">${bid.amount}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-xs italic">No bids recorded for this session yet.</p>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </Card>
  );
};
