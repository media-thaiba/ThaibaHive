/**
 * Add Threat Intelligence Feed Dialog
 * Sprint-039 / TIF-013
 */

"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { ThreatFeedConfig } from "@/lib/security/threat-intel/threat-feed-config";

interface AddThreatFeedDialogProps {
  onAddFeed: (feed: Partial<ThreatFeedConfig>) => Promise<boolean>;
}

export function AddThreatFeedDialog({ onAddFeed }: AddThreatFeedDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [authType, setAuthType] = useState<"none" | "basic" | "bearer" | "api-key">("none");
  const [token, setToken] = useState("");
  const [autoQuarantineConfidenceThreshold, setThreshold] = useState(80);
  const [pollIntervalMinutes, setPollInterval] = useState(60);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;

    setSubmitting(true);
    const success = await onAddFeed({
      name,
      url,
      authType,
      token: token || undefined,
      autoQuarantineConfidenceThreshold,
      pollIntervalMinutes,
    });
    setSubmitting(false);

    if (success) {
      setOpen(false);
      setName("");
      setUrl("");
      setToken("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="default" size="sm">
            + Add TAXII 2.1 Feed
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Configure Threat Intelligence Feed</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="feedName">Feed Name</Label>
            <Input
              id="feedName"
              placeholder="e.g. AlienVault OTX Educational Community"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedUrl">TAXII 2.1 Collection URL</Label>
            <Input
              id="feedUrl"
              placeholder="https://otx.alienvault.com/taxii/root/collections/.../objects/"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="auth">Authentication</Label>
              <Select id="auth" value={authType} onChange={(e) => setAuthType(e.target.value as any)}>
                <SelectItem value="none">None (Public)</SelectItem>
                <SelectItem value="api-key">API Key</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="basic">HTTP Basic</SelectItem>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">Auto-Quarantine Confidence</Label>
              <Select
                id="threshold"
                value={autoQuarantineConfidenceThreshold.toString()}
                onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
              >
                <SelectItem value="90">90% (Strict / High)</SelectItem>
                <SelectItem value="80">80% (Recommended)</SelectItem>
                <SelectItem value="70">70% (Aggressive)</SelectItem>
              </Select>
            </div>
          </div>

          {authType !== "none" && (
            <div className="space-y-2">
              <Label htmlFor="token">API Key / Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="Enter secret token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="interval">Polling Interval</Label>
            <Select
              id="interval"
              value={pollIntervalMinutes.toString()}
              onChange={(e) => setPollInterval(parseInt(e.target.value, 10))}
            >
              <SelectItem value="15">Every 15 minutes</SelectItem>
              <SelectItem value="30">Every 30 minutes</SelectItem>
              <SelectItem value="60">Every hour (Default)</SelectItem>
              <SelectItem value="360">Every 6 hours</SelectItem>
              <SelectItem value="1440">Daily</SelectItem>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={submitting}>
              {submitting ? "Saving Feed..." : "Add Feed"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
