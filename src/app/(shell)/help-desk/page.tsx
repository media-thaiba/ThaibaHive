"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { 
  MessageSquare, 
  Send, 
  User, 
  Clock, 
  AlertCircle, 
  Plus, 
  Wrench,
  Search,
  Filter,
  CheckCircle,
  Inbox
} from "lucide-react";

type Ticket = {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdByName: string;
  createdByLastName: string;
  assignedToName: string | null;
  assignedToLastName: string | null;
  assignedToId?: string | null;
  createdAt: string;
};

type Comment = {
  id: string;
  content: string;
  authorName: string;
  authorLastName: string;
  createdAt: string;
};

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
};

type Permissions = { role: string; permissions: string[] };

const statusVariant: Record<string, "info" | "warning" | "success" | "secondary"> = {
  open: "info",
  in_progress: "warning",
  resolved: "success",
  closed: "secondary",
};

const priorityVariant: Record<string, "success" | "warning" | "destructive"> = {
  low: "success",
  medium: "warning",
  high: "destructive",
};

export default function HelpDeskPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  
  // Ticket detail state
  const [ticketDetail, setTicketDetail] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    subject: "",
    description: "",
    category: "it",
    priority: "medium",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Staff and Permissions (for assignment & admin tools)
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [permissions, setPermissions] = useState<Permissions | null>(null);

  const isAdmin = permissions?.permissions.includes("helpdesk:manage") ?? false;

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/help-desk");
      const d = await res.json();
      setTickets(Array.isArray(d.tickets) ? d.tickets : []);
    } catch {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTicketDetail = useCallback(async (ticketId: string) => {
    try {
      const res = await fetch(`/api/help-desk/${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        setTicketDetail(data.ticket);
        setComments(data.comments || []);
      } else {
        toast.error("Failed to load ticket details");
      }
    } catch {
      toast.error("Error loading ticket detail");
    }
  }, []);

  const fetchStaffAndPermissions = useCallback(async () => {
    try {
      const [staffData, permsData] = await Promise.all([
        fetch("/api/staff").then((r) => r.json()).catch(() => ({ staff: [] })),
        fetch("/api/auth/permissions").then((r) => r.json()).catch(() => ({ permissions: [], role: "" })),
      ]);
      setStaffList(Array.isArray(staffData.staff) ? staffData.staff : []);
      if (permsData.role) setPermissions(permsData);
    } catch {
      // Ignore fallback
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchStaffAndPermissions();
  }, [fetchTickets, fetchStaffAndPermissions]);

  useEffect(() => {
    if (selected) {
      loadTicketDetail(selected);
    } else {
      setTicketDetail(null);
      setComments([]);
    }
  }, [selected, loadTicketDetail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      setError("Subject and description are required");
      return;
    }

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/help-desk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSuccess("Support ticket submitted successfully.");
        toast.success("Support ticket submitted");
        setShowForm(false);
        setForm({ subject: "", description: "", category: "it", priority: "medium" });
        fetchTickets();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to submit ticket. Please try again.");
      }
    } catch {
      setError("Network error. Please try submitting again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selected) return;

    setAddingComment(true);
    try {
      const res = await fetch(`/api/help-desk/${selected}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });

      if (res.ok) {
        setNewComment("");
        toast.success("Comment added");
        loadTicketDetail(selected);
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to post comment");
      }
    } catch {
      toast.error("Network error. Failed to add comment.");
    } finally {
      setAddingComment(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/help-desk/${selected}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        toast.success(`Status updated to ${status.replace("_", " ")}`);
        fetchTickets();
        loadTicketDetail(selected);
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to update status");
      }
    } catch {
      toast.error("Network error. Failed to update status.");
    }
  };

  const handleAssigneeChange = async (assignedToId: string) => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/help-desk/${selected}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId }),
      });

      if (res.ok) {
        toast.success("Ticket assignee updated");
        fetchTickets();
        loadTicketDetail(selected);
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to assign ticket");
      }
    } catch {
      toast.error("Network error. Failed to assign ticket.");
    }
  };

  const filteredTickets = tickets.filter(
    (t) =>
      (t.subject.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())) &&
      (statusFilter === "" || t.status === statusFilter)
  );

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="h-6 w-6 text-primary" /> IT Help Desk & Support
        </h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : <><Plus className="h-4 w-4 mr-1.5" /> Create Ticket</>}
        </Button>
      </div>

      {error && (
        <Alert variant="error" onDismiss={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onDismiss={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {showForm && (
        <Card className="max-w-2xl border bg-card shadow-sm animate-in fade-in duration-200">
          <CardHeader>
            <CardTitle>Submit a Support Ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Subject / Summary of issue"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
              />

              <Textarea
                placeholder="Describe the problem, steps to reproduce, or support requested..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <SelectItem value="it">IT Support</SelectItem>
                  <SelectItem value="hardware">Hardware / Device</SelectItem>
                  <SelectItem value="software">Software / Access</SelectItem>
                  <SelectItem value="facilities">Facilities / Maintenance</SelectItem>
                </Select>

                <Select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                </Select>
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Submitting..." : "Submit Support Ticket"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter and Content Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ticket List Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets by subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              className="w-40"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredTickets.map((t) => (
              <Card
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  selected === t.id ? "border-primary border-2" : "border"
                }`}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-sm line-clamp-1">{t.subject}</h3>
                    <Badge variant={statusVariant[t.status]}>{t.status.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t pt-2 mt-2">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" /> By: {t.createdByName} {t.createdByLastName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {t.createdAt?.split("T")[0]}
                    </span>
                    <Badge variant={priorityVariant[t.priority]} className="text-[9px] py-0 px-1 capitalize">
                      {t.priority}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredTickets.length === 0 && (
              <EmptyState
                icon={<Inbox className="h-12 w-12" />}
                title="No support tickets found"
                description="Create a new ticket or adjust search filters."
              />
            )}
          </div>
        </div>

        {/* Details Panel Column */}
        <div className="space-y-4">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold">Ticket Detail Panel</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col justify-between overflow-y-auto space-y-4">
              {selected && ticketDetail ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  {/* Detailed Description */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-muted-foreground capitalize">Category: {ticketDetail.category}</span>
                      <Badge variant={priorityVariant[ticketDetail.priority]}>{ticketDetail.priority} Priority</Badge>
                    </div>
                    <h4 className="font-bold text-sm">{ticketDetail.subject}</h4>
                    <p className="text-muted-foreground leading-relaxed bg-muted/40 p-2.5 rounded-lg border">
                      {ticketDetail.description}
                    </p>
                  </div>

                  {/* Admin assignment controls */}
                  {isAdmin && (
                    <div className="p-3 border rounded-lg bg-muted/20 space-y-2 text-xs">
                      <p className="font-semibold flex items-center gap-1 text-foreground">
                        <Wrench className="h-3.5 w-3.5 text-primary" /> Admin Controls
                      </p>
                      
                      {/* Ticket Status Selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground">Update Ticket Status</label>
                        <Select
                          value={ticketDetail.status}
                          onChange={(e) => handleUpdateStatus(e.target.value)}
                        >
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </Select>
                      </div>

                      {/* IT Assignee Selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground">Assign Staff Agent</label>
                        <Select
                          value={ticketDetail.assignedToId || ""}
                          onChange={(e) => handleAssigneeChange(e.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {staffList
                            .filter((s) => s.role === "admin" || s.role === "super_admin")
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.firstName} {s.lastName}
                              </option>
                            ))}
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Comment Thread */}
                  <div className="border-t pt-3 flex-1 flex flex-col justify-between min-h-[220px]">
                    <h5 className="font-bold text-xs flex items-center gap-1 text-foreground">
                      <MessageSquare className="h-3.5 w-3.5 text-primary" /> Conversation Thread
                    </h5>
                    
                    <div className="flex-1 overflow-y-auto space-y-2.5 my-2 max-h-[200px] pr-1">
                      {comments.map((c) => (
                        <div key={c.id} className="p-2 border rounded bg-muted/10 space-y-1">
                          <div className="flex justify-between items-center text-[9px] text-muted-foreground">
                            <span className="font-semibold text-foreground">{c.authorName} {c.authorLastName}</span>
                            <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-[11px] leading-snug">{c.content}</p>
                        </div>
                      ))}
                      {comments.length === 0 && (
                        <p className="text-[10px] text-muted-foreground/60 italic text-center py-4">No comments posted yet.</p>
                      )}
                    </div>

                    <form onSubmit={handleAddComment} className="flex gap-2 items-center mt-2 border-t pt-2">
                      <Input
                        placeholder="Type comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="text-xs h-8 flex-1"
                        disabled={addingComment}
                      />
                      <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={addingComment || !newComment.trim()}>
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center h-full">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-xs">Select a ticket from the list to view its conversation details and admin controls.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
