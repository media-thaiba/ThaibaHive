"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { CapabilityTags } from "./capability-tags";
import { StarRating } from "./star-rating";
import {
  APPROVAL_VARIANT,
  CATEGORY_LABEL,
  SCOPE_LABEL,
  parseCapabilities,
  parseManifest,
  type AgentPlugin,
  type PluginReview,
} from "./types";

type PluginDetailDialogProps = {
  plugin: AgentPlugin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PluginDetailDialog({ plugin, open, onOpenChange }: PluginDetailDialogProps) {
  const [reviews, setReviews] = useState<PluginReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !plugin) {
      setReviews([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/agent-plugins/${plugin.id}/reviews`)
      .then(async (res) => {
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Failed to load reviews");
          return;
        }
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load reviews");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, plugin]);

  if (!plugin) return null;

  const manifest = parseManifest(plugin.manifestJson);
  const capabilities = parseCapabilities(plugin.capabilitiesJson);
  const permissions = manifest.permissions || [];
  const budget = manifest.resourceBudget || {};
  const egress = manifest.egressUrls || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="truncate">{plugin.displayName}</span>
            <Badge variant={APPROVAL_VARIANT[plugin.approvalStatus]} className="text-[10px]">
              {plugin.approvalStatus.replace("_", " ")}
            </Badge>
            {plugin.status === "suspended" && (
              <Badge variant="destructive" className="text-[10px]">
                suspended
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {plugin.pluginKey}@{plugin.version} · {CATEGORY_LABEL[plugin.category] || plugin.category} ·{" "}
            {SCOPE_LABEL[plugin.scope]}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm">{plugin.description || plugin.summary}</p>

        <StarRating value={plugin.ratingAvg} count={plugin.ratingCount} />

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capabilities</h3>
          <CapabilityTags capabilities={capabilities} max={20} />
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Manifest</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <dt className="text-muted-foreground">Requested permissions</dt>
            <dd>{permissions.length > 0 ? permissions.join(", ") : "none"}</dd>
            <dt className="text-muted-foreground">Entry DSL</dt>
            <dd className="font-mono">{manifest.entryDslRef || "—"}</dd>
            <dt className="text-muted-foreground">Budget</dt>
            <dd>
              {budget.maxExecutionTimeMs ?? "—"} ms · {budget.maxMemoryMb ?? "—"} MB · {budget.maxTokens ?? "—"} tokens
            </dd>
            <dt className="text-muted-foreground">Egress URLs</dt>
            <dd className="break-all">{egress.length > 0 ? egress.join(", ") : "none"}</dd>
            <dt className="text-muted-foreground">Manifest hash</dt>
            <dd className="font-mono break-all">{plugin.manifestHash}</dd>
            <dt className="text-muted-foreground">Installs</dt>
            <dd>{plugin.installedCount}</dd>
          </dl>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Reviews ({reviews.length})
          </h3>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" aria-label="Loading reviews" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <Alert variant="warning" role="alert">
              {error}
            </Alert>
          ) : reviews.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No reviews yet.</p>
          ) : (
            <ul className="space-y-2">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-lg border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <StarRating value={r.rating} />
                    <span className="text-[11px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.reviewText && <p className="mt-1 text-xs">{r.reviewText}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
