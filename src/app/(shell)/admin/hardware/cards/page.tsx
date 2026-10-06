"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {  } from "@/components/ui/badge";
import {  } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import NfcAdminTable, { type NfcCardRow } from "@/components/nfc/nfc-admin-table";

export default function NfcCardsPage() {
  const [cards, setCards] = useState<NfcCardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerTagId, setRegisterTagId] = useState("");
  const [registerNotes, setRegisterNotes] = useState("");
  const [registering, setRegistering] = useState(false);
  const perPage = 20;

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", perPage.toString());
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/nfc/cards?${params.toString()}`);
      const data = await res.json();
      setCards(data.cards || []);
      setTotal(data.total ?? 0);
    } catch {
      setCards([]);
      setTotal(0);
    }
    setLoading(false);
  }, [page, statusFilter, search, perPage]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const totalPages = Math.ceil(total / perPage);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!registerTagId.trim()) return;
    setRegistering(true);
    try {
      const res = await fetch("/api/admin/nfc/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: registerTagId.trim(), notes: registerNotes || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to register card");
        setRegistering(false);
        return;
      }
      setRegisterOpen(false);
      setRegisterTagId("");
      setRegisterNotes("");
      fetchCards();
    } catch {
      alert("Failed to register card");
    }
    setRegistering(false);
  }

  async function handleAction(action: string, card: NfcCardRow) {
    switch (action) {
      case "assigned":
        fetchCards();
        break;
      case "unassign": {
        if (!confirm("Unassign this NFC card? It will become available for reassignment.")) return;
        await fetch(`/api/admin/nfc/cards/${card.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "available", notes: "Unassigned by admin" }),
        });
        fetchCards();
        break;
      }
      case "report-lost": {
        if (!confirm("Report this NFC card as lost?")) return;
        await fetch(`/api/admin/nfc/cards/${card.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "lost" }),
        });
        fetchCards();
        break;
      }
      case "retire": {
        if (!confirm("Retire this NFC card? This action cannot be undone.")) return;
        await fetch(`/api/admin/nfc/cards/${card.id}`, {
          method: "DELETE",
        });
        fetchCards();
        break;
      }
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">NFC Cards</h1>
          <p className="text-sm text-muted-foreground">{total} card{total !== 1 ? "s" : ""} total</p>
        </div>
        <Button onClick={() => setRegisterOpen(true)}>Register Card</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Search by tag ID, staff name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="w-40"
        >
          <option value="">All statuses</option>
          <option value="available">Available</option>
          <option value="assigned">Assigned</option>
          <option value="lost">Lost</option>
          <option value="retired">Retired</option>
        </Select>
      </div>

      <NfcAdminTable
        cards={cards}
        loading={loading}
        onAction={handleAction}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Register NFC Card</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tag ID *</label>
              <Input
                value={registerTagId}
                onChange={(e) => setRegisterTagId(e.target.value)}
                placeholder="Scan or enter the NFC tag UID"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={registerNotes}
                onChange={(e) => setRegisterNotes(e.target.value)}
                placeholder="Optional notes about this card"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setRegisterOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={registering || !registerTagId.trim()}>
                {registering ? "Registering..." : "Register"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
