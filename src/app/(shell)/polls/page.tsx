"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  BarChart2, 
  Clock, 
  CheckCircle2, 
  Plus, 
  Users, 
  Check
} from "lucide-react";

type PollOptionResult = {
  option: string;
  count: number;
  percentage: number;
};

type Poll = {
  id: string;
  question: string;
  options: PollOptionResult[];
  totalVotes: number;
  myVote: string | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  targetRole?: string | null;
  targetDepartmentId?: string | null;
  targetInstitutionId?: string | null;
};

type Department = { id: string; name: string };
type Institution = { id: string; name: string };
type Permissions = { role: string; permissions: string[] };

const roleOptions = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "principal", label: "Principal" },
  { value: "hod", label: "HOD" },
  { value: "staff", label: "Staff" },
];

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [form, setForm] = useState({
    question: "",
    optionInput: "",
    options: [] as string[],
    expiresAt: "",
    targetRole: "",
    targetDepartmentId: "",
    targetInstitutionId: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [permissions, setPermissions] = useState<Permissions | null>(null);

  const canCreate = permissions?.role === "super_admin" || (permissions?.permissions.includes("polls:create") ?? false);
  const _isAdmin = permissions?.role === "super_admin" || (permissions?.permissions.includes("polls:manage") ?? false);

  const loadData = useCallback(async () => {
    try {
      const [resultsData, deptsData, instsData, permsData] = await Promise.all([
        fetch("/api/polls/results").then((r) => r.json()),
        fetch("/api/departments").then((r) => r.json()).catch(() => ({ departments: [] })),
        fetch("/api/institutions").then((r) => r.json()).catch(() => ({ institutions: [] })),
        fetch("/api/auth/permissions").then((r) => r.json()).catch(() => ({ permissions: [], role: "" })),
      ]);

      setPolls(Array.isArray(resultsData.polls) ? resultsData.polls : []);
      setDepartments(Array.isArray(deptsData.departments) ? deptsData.departments : []);
      setInstitutions(Array.isArray(instsData.institutions) ? instsData.institutions : []);
      if (permsData.role) setPermissions(permsData);
    } catch {
      setError("Failed to load polls");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addOption = () => {
    const opt = form.optionInput.trim();
    if (opt && !form.options.includes(opt)) {
      setForm((prev) => ({
        ...prev,
        options: [...prev.options, opt],
        optionInput: "",
      }));
    }
  };

  const removeOption = (index: number) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.options.length < 2) {
      setError("A poll requires at least 2 options");
      return;
    }

    setError("");
    setSuccess("");
    setSubmitting(true);

    const payload = {
      title: form.question,
      question: form.question,
      options: form.options,
      targetRole: form.targetRole || undefined,
      targetDepartmentId: form.targetDepartmentId || undefined,
      targetInstitutionId: form.targetInstitutionId || undefined,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
    };

    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess("Poll created successfully!");
        toast.success("Poll published");
        setShowForm(false);
        setForm({
          question: "",
          optionInput: "",
          options: [],
          expiresAt: "",
          targetRole: "",
          targetDepartmentId: "",
          targetInstitutionId: "",
        });
        loadData();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to create poll. Please try again.");
      }
    } catch {
      setError("Failed to submit poll request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedOption: optionIndex }),
      });

      if (res.ok) {
        toast.success("Vote recorded successfully");
        loadData();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to submit vote");
      }
    } catch {
      toast.error("Network error. Please try voting again.");
    }
  };

  const isExpired = (poll: Poll) => {
    if (!poll.expiresAt) return false;
    return new Date(poll.expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Surveys & Polls</h1>
        {canCreate && (
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : <><Plus className="h-4 w-4 mr-1.5" /> Create Poll</>}
          </Button>
        )}
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

      {showForm && canCreate && (
        <Card className="max-w-2xl border bg-card shadow-sm animate-in fade-in duration-200">
          <CardHeader>
            <CardTitle>Create a New Poll</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Question */}
              <Input
                placeholder="Ask a question..."
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                required
              />

              {/* Add Options */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Options (Minimum 2)</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter an option..."
                    value={form.optionInput}
                    onChange={(e) => setForm({ ...form, optionInput: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOption();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={addOption}>
                    Add
                  </Button>
                </div>

                {/* Options List */}
                {form.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {form.options.map((opt, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 px-2.5 py-1 text-xs">
                        {opt}
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          className="text-muted-foreground hover:text-destructive shrink-0 transition-colors ml-1"
                        >
                          &times;
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Expiration Date */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Expiration Date (Optional)</label>
                <Input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Target Role */}
                <Select
                  value={form.targetRole}
                  onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
                >
                  <option value="">All Roles</option>
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </Select>

                {/* Target Department */}
                <Select
                  value={form.targetDepartmentId}
                  onChange={(e) => setForm({ ...form, targetDepartmentId: e.target.value })}
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </div>

              <div className="w-1/2">
                {/* Target Institution */}
                <Select
                  value={form.targetInstitutionId}
                  onChange={(e) => setForm({ ...form, targetInstitutionId: e.target.value })}
                >
                  <option value="">All Institutions</option>
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </Select>
              </div>

              <Button type="submit" disabled={submitting || form.options.length < 2} className="w-full">
                {submitting ? "Publishing..." : "Publish Poll"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Polls Dashboard Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {polls.map((poll) => {
          const expired = isExpired(poll);
          const active = poll.isActive && !expired;
          const hasVoted = !!poll.myVote;

          return (
            <Card key={poll.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-base leading-snug">{poll.question}</h3>
                  <Badge variant={active ? "success" : "secondary"}>
                    {active ? "Active" : "Closed"}
                  </Badge>
                </div>
                {poll.expiresAt && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" /> Expires: {poll.expiresAt.split("T")[0]}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4 pt-0 text-xs">
                {/* Poll Options (showing progress bars if already voted or closed) */}
                <div className="space-y-3">
                  {poll.options.map((opt, idx) => {
                    const optionSelected = poll.myVote === opt.option;
                    
                    return (
                      <div key={opt.option} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="flex items-center gap-1.5 truncate">
                            {optionSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                            {opt.option}
                          </span>
                          {(hasVoted || !active) && (
                            <span className="text-muted-foreground text-[10px]">{opt.count} ({opt.percentage}%)</span>
                          )}
                        </div>
                        {(hasVoted || !active) ? (
                          <Progress value={opt.percentage} className="h-2" />
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => handleVote(poll.id, idx)}
                            className="w-full text-left justify-start font-normal h-8 text-xs hover:bg-primary/5 hover:border-primary transition-colors"
                          >
                            {opt.option}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-muted-foreground border-t pt-2 mt-auto text-[10px]">
                  <span className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded font-medium text-foreground">
                    <Users className="h-3 w-3" /> {poll.totalVotes} total votes
                  </span>
                  {hasVoted && (
                    <span className="flex items-center gap-1 text-primary font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Voted: {poll.myVote}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {polls.length === 0 && (
          <div className="col-span-full py-8">
            <EmptyState
              icon={<BarChart2 className="h-12 w-12" />}
              title="No polls available"
              description="When a survey or poll is published, it will show up here."
            />
          </div>
        )}
      </div>
    </div>
  );
}
