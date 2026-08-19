"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { StaffMember } from "./types";
import { ID_TYPES } from "./types";

export function RegisterVisitorModal({
  open,
  onClose,
  onSubmit,
  staffList,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    contact: string;
    idType: string;
    idNumber: string;
    hostStaffId: string;
    purpose: string;
    notes: string;
  }) => Promise<void>;
  staffList: StaffMember[];
  loading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    idType: "",
    idNumber: "",
    hostStaffId: "",
    purpose: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<typeof formData>>({});

  const validate = () => {
    const newErrors: Partial<typeof formData> = {};
    if (!formData.name.trim()) newErrors.name = "Visitor name is required";
    if (!formData.purpose.trim()) newErrors.purpose = "Purpose of visit is required";
    if (!formData.hostStaffId) newErrors.hostStaffId = "Host staff member is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
    onClose();
    setFormData({ name: "", contact: "", idType: "", idNumber: "", hostStaffId: "", purpose: "", notes: "" });
    setErrors({});
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register Visitor / Check-In</DialogTitle>
          <DialogDescription>
            Enter visitor details to register their visit
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Visitor Name <span className="text-destructive">*</span></label>
            <Input
              placeholder="Full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Contact Number</label>
            <Input
              type="tel"
              placeholder="+91 98765 43210"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ID Type</label>
              <Select
                value={formData.idType}
                onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
              >
                <SelectItem value="">Select ID type</SelectItem>
                {ID_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">ID Number</label>
              <Input
                placeholder="ID number"
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Host Staff Member <span className="text-destructive">*</span></label>
            <Select
              value={formData.hostStaffId}
              onChange={(e) => setFormData({ ...formData, hostStaffId: e.target.value })}
              className={errors.hostStaffId ? "border-destructive" : ""}
            >
              <SelectItem value="">Select host staff</SelectItem>
              {staffList.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.firstName} {staff.lastName} — {staff.designation || staff.email}
                </SelectItem>
              ))}
            </Select>
            {errors.hostStaffId && <p className="text-xs text-destructive">{errors.hostStaffId}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Purpose of Visit <span className="text-destructive">*</span></label>
            <Input
              placeholder="Meeting, delivery, interview, etc."
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              className={errors.purpose ? "border-destructive" : ""}
            />
            {errors.purpose && <p className="text-xs text-destructive">{errors.purpose}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Additional notes (optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Register & Check-In
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
