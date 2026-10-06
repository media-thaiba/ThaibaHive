"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Delegation = {
  id: string;
  delegatorId: string;
  delegateId: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean | number;
  reason: string | null;
  createdAt: string;
  delegatorFirstName: string | null;
  delegatorLastName: string | null;
  delegateFirstName: string | null;
  delegateLastName: string | null;
};

type StaffMember = {
  id: string;
  name: string;
  role: string;
};

export default function DelegationsPage() {
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    delegateId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.staff?.id) setCurrentUserId(data.staff.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/approvals/delegations?staffList=true");
      const data = await res.json();
      setDelegations(data.delegations || []);
      setStaffList(data.staffList || []);
    } catch {
      toast.error("Failed to load delegations");
    } finally {
      setLoading(false);
    }
  }

  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) &&
      s.id !== currentUserId
  );

  const isActive = (d: Delegation) =>
    typeof d.isActive === "boolean" ? d.isActive : d.isActive === 1;

  async function handleCreate() {
    if (!form.delegateId || !form.startDate) {
      toast.error("Please select a delegate and start date");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/approvals/delegations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delegatorId: currentUserId,
          delegateId: form.delegateId,
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          reason: form.reason || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Delegation created");
        setShowForm(false);
        setForm({ delegateId: "", startDate: "", endDate: "", reason: "" });
        setSearch("");
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(d: Delegation) {
    try {
      const res = await fetch("/api/approvals/delegations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: d.id, isActive: !isActive(d) }),
      });
      if (res.ok) {
        toast.success(isActive(d) ? "Delegation deactivated" : "Delegation activated");
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update");
      }
    } catch {
      toast.error("Something went wrong");
    }
  }

  async function handleDelete(d: Delegation) {
    if (!confirm("Delete this delegation?")) return;
    try {
      const res = await fetch(`/api/approvals/delegations?id=${d.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Delegation deleted");
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
      }
    } catch {
      toast.error("Something went wrong");
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approval Delegations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Delegate your approval authority when you&apos;re unavailable
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>New Delegation</Button>
      </div>

      {delegations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mb-4"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" x2="19" y1="8" y2="14" />
            <line x1="22" x2="16" y1="11" y2="11" />
          </svg>
          <p className="text-lg font-medium">No delegations yet</p>
          <p className="text-sm mt-1">
            Create a delegation to let someone approve on your behalf
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {delegations.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isActive(d) ? "success" : "secondary"}
                      >
                        {isActive(d) ? "Active" : "Inactive"}
                      </Badge>
                      {d.reason && (
                        <span className="text-xs text-muted-foreground truncate">
                          {d.reason}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>
                        <span className="text-muted-foreground">From:</span>{" "}
                        <span className="font-medium">
                          {d.delegatorFirstName} {d.delegatorLastName}
                        </span>
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-muted-foreground"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                      <span>
                        <span className="text-muted-foreground">To:</span>{" "}
                        <span className="font-medium">
                          {d.delegateFirstName} {d.delegateLastName}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Start: {formatDate(d.startDate)}</span>
                      {d.endDate && <span>End: {formatDate(d.endDate)}</span>}
                      <span>Created: {formatDate(d.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant={isActive(d) ? "outline" : "default"}
                      onClick={() => toggleActive(d)}
                    >
                      {isActive(d) ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(d)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setSearch(""); } }}>
        <DialogContent className="sm:max-w-md space-y-4">
          <DialogHeader>
            <DialogTitle>New Delegation</DialogTitle>
          </DialogHeader>
 
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Delegate *</label>
            <Input
              placeholder="Search staff..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setForm((f) => ({ ...f, delegateId: "" }));
              }}
            />
            {search && filteredStaff.length > 0 && (
              <div className="max-h-40 overflow-auto rounded-md border divide-y">
                {filteredStaff.map((s) => (
                  <Button
                    key={s.id}
                    type="button"
                    variant="ghost"
                    className={`w-full justify-start font-normal h-auto py-2 px-3 hover:bg-muted text-sm rounded-none transition-colors ${
                      form.delegateId === s.id ? "bg-primary/10 font-medium" : ""
                    }`}
                    onClick={() => {
                      setForm((f) => ({ ...f, delegateId: s.id }));
                      setSearch(s.name);
                    }}
                  >
                    {s.name}
                    <span className="text-xs text-muted-foreground ml-2 capitalize">
                      ({s.role.replace("_", " ")})
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>
 
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Start Date *</label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, startDate: e.target.value }))
              }
            />
          </div>
 
          <div className="space-y-1.5">
            <label className="text-sm font-medium">End Date</label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, endDate: e.target.value }))
              }
            />
          </div>
 
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reason</label>
            <Textarea
              placeholder="Optional – why is this delegation needed?"
              value={form.reason}
              onChange={(e) =>
                setForm((f) => ({ ...f, reason: e.target.value }))
              }
              rows={2}
            />
          </div>
 
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setSearch("");
              }}
            >
              Cancel
            </Button>
            <Button size="sm" disabled={submitting} onClick={handleCreate}>
              {submitting ? "Creating..." : "Create Delegation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
