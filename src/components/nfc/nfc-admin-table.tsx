"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export type NfcCardRow = {
  id: string;
  tagId: string;
  status: "available" | "assigned" | "lost" | "retired";
  assignedToId: string | null;
  assignedAt: string | null;
  assignedById: string | null;
  lastCheckedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  assigneeName: string | null;
};

type NfcAdminTableProps = {
  cards: NfcCardRow[];
  loading?: boolean;
  onAction: (action: string, card: NfcCardRow) => void;
};

const statusVariant = (status: string) => {
  switch (status) {
    case "available": return "info" as const;
    case "assigned": return "success" as const;
    case "lost": return "warning" as const;
    case "retired": return "secondary" as const;
    default: return "default" as const;
  }
};

function formatDate(date: string | null | undefined): string {
  if (!date) return "\u2014";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function NfcAdminTable({ cards, loading, onAction }: NfcAdminTableProps) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignCard, setAssignCard] = useState<NfcCardRow | null>(null);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffResults, setStaffResults] = useState<{ id: string; name: string; employeeId: string }[]>([]);
  const [searching, setSearching] = useState(false);

  async function openAssignDialog(card: NfcCardRow) {
    setAssignCard(card);
    setStaffSearch("");
    setStaffResults([]);
    setAssignOpen(true);
  }

  async function searchStaff(query: string) {
    setStaffSearch(query);
    if (query.length < 2) {
      setStaffResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/staff?search=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      setStaffResults(
        (data.staff || []).map((s: { id: string; firstName: string; lastName: string; employeeId: string }) => ({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`.trim(),
          employeeId: s.employeeId,
        }))
      );
    } catch {
      setStaffResults([]);
    }
    setSearching(false);
  }

  async function confirmAssign(staffId: string) {
    if (!assignCard) return;
    try {
      const res = await fetch("/api/admin/nfc/cards/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: assignCard.id, staffId }),
      });
      if (res.ok) {
        onAction("assigned", assignCard);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to assign card");
      }
    } catch {
      alert("Failed to assign card");
    }
    setAssignOpen(false);
    setAssignCard(null);
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cards.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No NFC cards found. Register a card to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Tag ID</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Assignee</th>
                <th className="px-4 py-3 text-left font-medium">Last Checked</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{card.tagId}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(card.status)} className="text-[10px]">
                      {card.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {card.assigneeName || "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatDate(card.lastCheckedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {card.status === "available" && (
                        <Button variant="outline" size="xs" onClick={() => openAssignDialog(card)}>
                          Assign
                        </Button>
                      )}
                      {card.status === "assigned" && (
                        <>
                          <Button variant="ghost" size="xs" onClick={() => onAction("unassign", card)}>
                            Unassign
                          </Button>
                          <Button variant="ghost" size="xs" className="text-warning hover:text-warning" onClick={() => onAction("report-lost", card)}>
                            Report Lost
                          </Button>
                        </>
                      )}
                      {card.status !== "retired" && card.status !== "assigned" && (
                        <Button variant="ghost" size="xs" className="text-destructive hover:text-destructive" onClick={() => onAction("retire", card)}>
                          Retire
                        </Button>
                      )}
                      {card.status === "retired" && (
                        <span className="text-xs text-muted-foreground">\u2014</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign NFC Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Card: <span className="font-mono font-medium text-foreground">{assignCard?.tagId}</span>
            </p>
            <Input
              placeholder="Search staff by name or employee ID..."
              value={staffSearch}
              onChange={(e) => searchStaff(e.target.value)}
              autoFocus
            />
            {searching && <p className="text-xs text-muted-foreground">Searching...</p>}
            {staffResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {staffResults.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                    onClick={() => confirmAssign(s.id)}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">({s.employeeId})</span>
                  </button>
                ))}
              </div>
            )}
            {staffSearch.length >= 2 && staffResults.length === 0 && !searching && (
              <p className="text-xs text-muted-foreground">No matching staff found</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
