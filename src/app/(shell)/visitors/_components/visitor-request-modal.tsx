"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function VisitorRequestModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    visitorName: string;
    visitorPhone: string;
    hostStaffId: string;
    purpose: string;
    expectedDate: string;
  }) => void;
}) {
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [hostStaffId, setHostStaffId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [expectedDate, setExpectedDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName || !visitorPhone || !expectedDate) return;
    onSubmit({ visitorName, visitorPhone, hostStaffId: hostStaffId || "staff_1", purpose: purpose || "Official Visit", expectedDate });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pre-Register Campus Visitor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Visitor Full Name</label>
            <Input placeholder="e.g. Michael Scott" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
            <Input placeholder="+1 555-0192" value={visitorPhone} onChange={(e) => setVisitorPhone(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Expected Visit Date</label>
            <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Purpose of Visit</label>
            <Input placeholder="Parent Meeting / Vendor Delivery" value={purpose} onChange={(e) => setPurpose(e.target.value)} required />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Pre-Register Visitor</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
