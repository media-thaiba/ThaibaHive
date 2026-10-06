"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Award, Star, Trophy, Heart, Lightbulb, Crown, Send } from "lucide-react";
import { formatDate, ensureArray } from "@/lib/utils";

type Recognition = {
  id: string;
  type: string;
  reason: string;
  recognizedByName: string;
  recognizedByLastName: string;
  recipientName: string;
  recipientLastName: string;
  createdAt: string;
};

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  designation: string | null;
};

type FilterTab = "all" | "kudos" | "employee_of_month" | "leadership_innovation" | "mine";

const recognitionTypes = [
  { value: "kudos", label: "Kudos", icon: Star, emoji: "🌟", color: "warning" as const },
  { value: "employee_of_month", label: "Employee of the Month", icon: Trophy, emoji: "🏆", color: "success" as const },
  { value: "team_player", label: "Team Player", icon: Heart, emoji: "🤝", color: "info" as const },
  { value: "innovation", label: "Innovation", icon: Lightbulb, emoji: "💡", color: "warning" as const },
  { value: "leadership", label: "Leadership", icon: Crown, emoji: "👑", color: "destructive" as const },
];

const badgeVariant: Record<string, "success" | "warning" | "destructive" | "info" | "secondary"> = {
  kudos: "warning",
  employee_of_month: "success",
  team_player: "info",
  innovation: "warning",
  leadership: "destructive",
};

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All Recognitions" },
  { key: "kudos", label: "Kudos" },
  { key: "employee_of_month", label: "Employee of the Month" },
  { key: "leadership_innovation", label: "Leadership & Innovation" },
  { key: "mine", label: "My Kudos" },
];

export default function RecognitionPage() {
  const [recognitions, setRecognitions] = useState<Recognition[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ staffId: "", type: "kudos", reason: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [recRes, staffRes] = await Promise.all([
      api.get<{ recognitions: Recognition[] }>("/api/recognition"),
      api.get<{ staff: StaffMember[] }>("/api/staff"),
    ]);
    setRecognitions(ensureArray(recRes.data?.recognitions));
    setStaffList(ensureArray(staffRes.data?.staff));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSubmitting(true);
    try {
      const res = await api.post("/api/recognition", {
        staffId: form.staffId,
        type: form.type,
        reason: form.reason,
      }, { toast: false });
      if (res.ok) {
        setDialogOpen(false);
        setForm({ staffId: "", type: "kudos", reason: "" });
        setSuccess("Recognition sent successfully!");
        fetchData();
      } else {
        setError("Failed to send recognition. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = recognitions.filter((r) => {
    if (activeTab === "kudos") return r.type === "kudos";
    if (activeTab === "employee_of_month") return r.type === "employee_of_month";
    if (activeTab === "leadership_innovation") return r.type === "leadership" || r.type === "innovation";
    return true;
  });

  const topKudos = [...recognitions]
    .filter((r) => r.type === "kudos" || r.type === "employee_of_month")
    .slice(0, 5);

  const eomTop = recognitions.find((r) => r.type === "employee_of_month");

  const getTypeConfig = (type: string) => recognitionTypes.find((t) => t.value === type) || recognitionTypes[0];

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <PageHeader
        title="Staff Recognition"
        description="Celebrate achievements and send kudos to colleagues."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Send className="h-4 w-4 mr-1.5" />
            Send Recognition
          </Button>
        }
      />

      {error && <Alert variant="error" onDismiss={() => setError("")}>{error}</Alert>}
      {success && <Alert variant="success" onDismiss={() => setSuccess("")}>{success}</Alert>}

      {(eomTop || topKudos.length > 0) && (
        <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Recognition Showcase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {eomTop && (
                <div className="rounded-lg bg-background/80 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-success" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-success">Employee of the Month</span>
                  </div>
                  <p className="text-base font-bold">{eomTop.recipientName} {eomTop.recipientLastName}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{eomTop.reason}</p>
                  <p className="text-xs text-muted-foreground">Recognized by {eomTop.recognizedByName} {eomTop.recognizedByLastName}</p>
                </div>
              )}
              <div className="rounded-lg bg-background/80 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-warning" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-warning">Top Kudos Recipients</span>
                </div>
                <div className="space-y-1.5">
                  {topKudos.length > 0 ? topKudos.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{r.recipientName} {r.recipientLastName}</span>
                      <span className="text-xs text-muted-foreground">{getTypeConfig(r.type).emoji}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">No kudos yet.</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {filterTabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Award className="h-12 w-12" />}
              title="No recognitions found"
              description="Send the first recognition to celebrate a colleague's achievements!"
              action={{ label: "Send Recognition", onClick: () => setDialogOpen(true) }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const cfg = getTypeConfig(r.type);
            return (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cfg.emoji}</span>
                      <CardTitle className="text-sm">{r.recipientName} {r.recipientLastName}</CardTitle>
                    </div>
                    <Badge variant={badgeVariant[r.type] || "secondary"}>{cfg.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-3">{r.reason}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span>From: {r.recognizedByName} {r.recognizedByLastName}</span>
                    <span>{formatDate(r.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Recognition</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient</label>
              <Select
                value={form.staffId}
                onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                required
              >
                <SelectItem value="">Select staff member...</SelectItem>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}{s.designation ? ` (${s.designation})` : ""}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Recognition Type</label>
              <div className="grid grid-cols-2 gap-2">
                {recognitionTypes.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({ ...form, type: t.value })}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm text-left transition-colors ${
                      form.type === t.value
                        ? "bg-primary/10 border-primary text-primary"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-base">{t.emoji}</span>
                    <span className="font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason / Appreciation</label>
              <Textarea
                placeholder="Why are you recognizing this person?"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={3}
                required
              />
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Sending..." : "Send Recognition"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
