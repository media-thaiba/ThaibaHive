/**
 * Manual IP Quarantine Dialog
 * Sprint-038 / AGS-013
 */

"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";

interface ManualQuarantineDialogProps {
  onQuarantine: (data: { ipAddress: string; cidrMask: string; reason: string; durationMinutes: number }) => Promise<boolean>;
}

export function ManualQuarantineDialog({ onQuarantine }: ManualQuarantineDialogProps) {
  const [open, setOpen] = useState(false);
  const [ipAddress, setIpAddress] = useState("");
  const [cidrMask, setCidrMask] = useState("/32");
  const [reason, setReason] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipAddress || !reason) return;

    setSubmitting(true);
    const success = await onQuarantine({
      ipAddress,
      cidrMask,
      reason,
      durationMinutes,
    });
    setSubmitting(false);

    if (success) {
      setOpen(false);
      setIpAddress("");
      setReason("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm">
            + Add IP Quarantine
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Quarantine Malicious IP / Subnet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="ip">IP Address</Label>
            <Input
              id="ip"
              placeholder="e.g. 198.51.100.45"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cidr">Subnet Scope</Label>
            <Select id="cidr" value={cidrMask} onChange={(e) => setCidrMask(e.target.value)}>
              <SelectItem value="/32">Single IP (/32)</SelectItem>
              <SelectItem value="/24">Entire /24 Subnet (Class C block)</SelectItem>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Quarantine Reason</Label>
            <Input
              id="reason"
              placeholder="e.g. Credential stuffing brute force campaign"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Ban Duration</Label>
            <Select
              id="duration"
              value={durationMinutes.toString()}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
            >
              <SelectItem value="15">15 Minutes</SelectItem>
              <SelectItem value="60">1 Hour</SelectItem>
              <SelectItem value="360">6 Hours</SelectItem>
              <SelectItem value="1440">24 Hours</SelectItem>
              <SelectItem value="10080">7 Days</SelectItem>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? "Applying..." : "Apply Quarantine"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
