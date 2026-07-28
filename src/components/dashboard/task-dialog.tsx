import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";

type StaffMember = { id: string; firstName: string; lastName: string };

type TaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
};

export function TaskDialog({ open, onOpenChange, onSubmitted }: TaskDialogProps) {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", dueDate: "", assignedToId: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = async () => {
    setForm({ title: "", description: "", priority: "medium", dueDate: "", assignedToId: "" });
    try {
      const res = await fetch("/api/staff").then((r) => r.json());
      setStaffList(res.staff || []);
    } catch { setStaffList([]); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) { toast.error("Title is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          priority: form.priority,
          dueDate: form.dueDate || undefined,
          assignedToId: form.assignedToId || undefined
        })
      });
      const body = await res.json();
      if (!res.ok) { toast.error(body.error || "Failed to create task"); return; }
      toast.success("Task created successfully!");
      onOpenChange(false); onSubmitted();
    } catch { toast.error("Failed to create task"); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (o) handleOpen(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title *</Label>
            <Input id="task-title" placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea id="task-desc" placeholder="Task description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <Select id="task-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due Date</Label>
              <Input id="task-due" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-assign">Assign To</Label>
            <Select id="task-assign" value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}>
              <option value="">Unassigned</option>
              {staffList.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
