"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export interface RegionalGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated: () => void;
}

export function RegionalGroupModal({ open, onOpenChange, onGroupCreated }: RegionalGroupModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      setError("Name and Code are required.");
      return;
    }

    setLoading(true);
    setError(null);

    fetch("/api/admin/regional/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code, description }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to create regional group");
        return res.json();
      })
      .then(() => {
        setLoading(false);
        setName("");
        setCode("");
        setDescription("");
        onOpenChange(false);
        onGroupCreated();
      })
      .catch((err) => {
        setLoading(false);
        setError(err.message);
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white p-6 rounded-xl border border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">Create Regional Group Cluster</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && <div className="text-xs text-rose-600 font-medium">{error}</div>}

          <div className="space-y-1">
            <Label htmlFor="group-name">Regional Group Name</Label>
            <Input
              id="group-name"
              placeholder="e.g. Southern Education Zone"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="group-code">Group Code</Label>
            <Input
              id="group-code"
              placeholder="e.g. REG-SOUTH-01"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="group-desc">Description (Optional)</Label>
            <Input
              id="group-desc"
              placeholder="Regional cluster description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? "Creating..." : "Create Regional Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
