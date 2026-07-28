import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";

type LeaveType = { id: string; name: string };

type LeaveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
};

export function LeaveDialog({ open, onOpenChange, onSubmitted }: LeaveDialogProps) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [form, setForm] = useState({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = async () => {
    setForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
    try {
      const res = await fetch("/api/leaves/types").then((r) => r.json());
      setLeaveTypes(res.leaveTypes || []);
    } catch { setLeaveTypes([]); }
  };

  const calcDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const diff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
    return diff > 0 ? diff : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const daysCount = calcDays(form.startDate, form.endDate);
    if (!form.leaveTypeId || !form.startDate || !form.endDate || daysCount <= 0) {
      toast.error("Please fill all required fields"); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, daysCount })
      });
      const body = await res.json();
      if (!res.ok) { toast.error(body.error || "Failed to submit leave"); return; }
      toast.success("Leave request submitted");
      onOpenChange(false); onSubmitted();
    } catch { toast.error("Failed to submit leave"); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (o) handleOpen(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="leave-type">Leave Type *</Label>
            <Select id="leave-type" value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })} required>
              <option value="">Select leave type</option>
              {leaveTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="leave-start">Start Date *</Label>
              <Input id="leave-start" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leave-end">End Date *</Label>
              <Input id="leave-end" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
            </div>
          </div>
          {form.startDate && form.endDate && (
            <p className="text-xs text-muted-foreground">Duration: {calcDays(form.startDate, form.endDate)} day(s)</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="leave-reason">Reason</Label>
            <Textarea id="leave-reason" placeholder="Reason for leave (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Request"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
