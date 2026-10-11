"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Select, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { agentPluginPublishSchema } from "@/lib/validation/schemas";
import { PLUGIN_CATEGORIES, PLUGIN_SCOPES } from "./types";

type PublishPluginDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished: () => void;
};

const EMPTY_FORM = {
  pluginKey: "",
  displayName: "",
  summary: "",
  description: "",
  version: "1.0.0",
  scope: "institution_private",
  category: "general",
  capabilities: "",
  permissions: "",
  egressUrls: "",
  entryDslRef: "",
  maxExecutionTimeMs: "30000",
  maxMemoryMb: "256",
  maxTokens: "20000",
};

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export function PublishPluginDialog({ open, onOpenChange, onPublished }: PublishPluginDialogProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM });
      setErrors([]);
    }
  }, [open]);

  const payload = useMemo(
    () => ({
      pluginKey: form.pluginKey.trim(),
      displayName: form.displayName.trim(),
      summary: form.summary.trim(),
      description: form.description.trim() || undefined,
      version: form.version.trim(),
      scope: form.scope,
      category: form.category,
      capabilities: splitList(form.capabilities),
      manifest: {
        permissions: splitList(form.permissions),
        resourceBudget: {
          maxExecutionTimeMs: Number(form.maxExecutionTimeMs) || undefined,
          maxMemoryMb: Number(form.maxMemoryMb) || undefined,
          maxTokens: Number(form.maxTokens) || undefined,
        },
        entryDslRef: form.entryDslRef.trim() || undefined,
        egressUrls: splitList(form.egressUrls),
      },
    }),
    [form]
  );

  const update = (key: keyof typeof EMPTY_FORM) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrors([]);

    const parsed = agentPluginPublishSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/agent-plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const details = Array.isArray(data.details)
          ? data.details
          : data.details && typeof data.details === "object"
            ? Object.values(data.details)
                .flat()
                .map((d) => String(d))
            : [];
        setErrors(details.length > 0 ? details.map(String) : [data.error || "Publish failed"]);
        toast.error(data.error || "Failed to publish plugin");
        return;
      }
      toast.success(`${data.plugin?.displayName || "Plugin"} submitted for review`);
      onPublished();
      onOpenChange(false);
    } catch {
      setErrors(["Network error while publishing"]);
      toast.error("Network error while publishing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publish an agent plugin</DialogTitle>
          <DialogDescription>
            Plugins land in <code className="rounded bg-muted px-1">pending_review</code>. Only approved, active
            plugins can be installed. Privilege escalation is rejected at install time.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="pp-key">Plugin key</Label>
            <Input id="pp-key" value={form.pluginKey} onChange={update("pluginKey")} placeholder="fee-escalation-bot" maxLength={128} />
            <p className="text-[11px] text-muted-foreground">lowercase letters, digits, - _ . · immutable per version</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pp-name">Display name</Label>
            <Input id="pp-name" value={form.displayName} onChange={update("displayName")} maxLength={128} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pp-version">Version (semver)</Label>
            <Input id="pp-version" value={form.version} onChange={update("version")} placeholder="1.0.0" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pp-category">Category</Label>
            <Select id="pp-category" value={form.category} onChange={update("category")}>
              {PLUGIN_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pp-scope">Scope</Label>
            <Select id="pp-scope" value={form.scope} onChange={update("scope")}>
              {PLUGIN_SCOPES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </Select>
            <p className="text-[11px] text-muted-foreground">global requires super_admin approval</p>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="pp-summary">Summary</Label>
            <Textarea id="pp-summary" value={form.summary} onChange={update("summary")} maxLength={512} className="min-h-[60px]" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="pp-description">Description</Label>
            <Textarea id="pp-description" value={form.description} onChange={update("description")} className="min-h-[60px]" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="pp-capabilities">Capability tags</Label>
            <Input id="pp-capabilities" value={form.capabilities} onChange={update("capabilities")} placeholder="fees:read, fees:write, notify:guardians" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="pp-permissions">Requested tool permissions</Label>
            <Input id="pp-permissions" value={form.permissions} onChange={update("permissions")} placeholder="fees:read, notifications:send" />
            <p className="text-[11px] text-muted-foreground">
              Installers only receive the intersection with their own role permissions.
            </p>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="pp-egress">Egress URLs</Label>
            <Input id="pp-egress" value={form.egressUrls} onChange={update("egressUrls")} placeholder="https://api.example.com, https://hooks.example.com" />
            <p className="text-[11px] text-muted-foreground">SSRF-guarded at execution time.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pp-dsl">Entry DSL ref</Label>
            <Input id="pp-dsl" value={form.entryDslRef} onChange={update("entryDslRef")} placeholder="wf_fee_escalation" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pp-timeout">Max execution (ms)</Label>
            <Input id="pp-timeout" type="number" min={1} value={form.maxExecutionTimeMs} onChange={update("maxExecutionTimeMs")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pp-memory">Max memory (MB)</Label>
            <Input id="pp-memory" type="number" min={1} value={form.maxMemoryMb} onChange={update("maxMemoryMb")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pp-tokens">Max tokens</Label>
            <Input id="pp-tokens" type="number" min={1} value={form.maxTokens} onChange={update("maxTokens")} />
          </div>
        </div>

        {errors.length > 0 && (
          <Alert variant="error" role="alert" aria-label="Publish validation errors">
            <p className="font-semibold text-sm mb-1">Could not publish</p>
            <ul className="list-disc pl-5 space-y-0.5">
              {errors.map((e, i) => (
                <li key={i} className="text-xs">
                  {e}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Publishing…" : "Submit for review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
