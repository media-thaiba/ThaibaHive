"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectItem } from "@/components/ui/select";
import { PermissionGate } from "@/components/ui/permission-gate";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { Search, Store, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { PluginCard } from "./_components/plugin-card";
import { PublishPluginDialog } from "./_components/publish-plugin-dialog";
import { ApprovalDialog } from "./_components/approval-dialog";
import { ReviewComposerDialog } from "./_components/review-composer-dialog";
import { PluginDetailDialog } from "./_components/plugin-detail-dialog";
import {
  CATEGORY_LABEL,
  PLUGIN_CATEGORIES,
  type AgentPlugin,
  type PluginInstallation,
} from "./_components/types";

type Tab = "all" | "installed" | "pending_review" | "approved";

export default function AgentMarketplacePage() {
  const [plugins, setPlugins] = useState<AgentPlugin[]>([]);
  const [installations, setInstallations] = useState<PluginInstallation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [scope, setScope] = useState("all");
  const [tab, setTab] = useState<Tab>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [publishOpen, setPublishOpen] = useState(false);
  const [detailPlugin, setDetailPlugin] = useState<AgentPlugin | null>(null);
  const [reviewPlugin, setReviewPlugin] = useState<AgentPlugin | null>(null);
  const [approval, setApproval] = useState<{ plugin: AgentPlugin; action: "approve" | "reject" } | null>(null);
  const [deprecateTarget, setDeprecateTarget] = useState<AgentPlugin | null>(null);

  const installedIds = useMemo(() => new Set(installations.map((i) => i.pluginId)), [installations]);

  const loadAll = useCallback(async () => {
    try {
      const [pluginsRes, installsRes] = await Promise.all([
        fetch("/api/agent-plugins"),
        fetch("/api/agent-plugins/installations"),
      ]);
      const pluginsData = await pluginsRes.json().catch(() => ({}));
      const installsData = await installsRes.json().catch(() => ({}));
      if (pluginsRes.ok) {
        setPlugins(Array.isArray(pluginsData.plugins) ? pluginsData.plugins : []);
      } else if (pluginsRes.status === 403) {
        toast.error(pluginsData.error || "Marketplace feature is disabled");
      } else {
        toast.error(pluginsData.error || "Failed to load plugins");
      }
      if (installsRes.ok) {
        setInstallations(Array.isArray(installsData.installations) ? installsData.installations : []);
      }
    } catch {
      toast.error("Failed to load agent marketplace");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll().catch(() => {});
  }, [loadAll]);

  const handleInstall = useCallback(
    async (plugin: AgentPlugin) => {
      setBusyId(plugin.id);
      try {
        const res = await fetch(`/api/agent-plugins/${plugin.id}/install`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: true }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error || "Install failed");
          return;
        }
        toast.success(`${plugin.displayName} installed`);
        await loadAll();
      } catch {
        toast.error("Network error while installing");
      } finally {
        setBusyId(null);
      }
    },
    [loadAll]
  );

  const handleUninstall = useCallback(
    async (plugin: AgentPlugin) => {
      setBusyId(plugin.id);
      try {
        const res = await fetch(`/api/agent-plugins/${plugin.id}/install`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok && res.status !== 404) {
          toast.error(data.error || "Uninstall failed");
          return;
        }
        toast.success(`${plugin.displayName} uninstalled`);
        await loadAll();
      } catch {
        toast.error("Network error while uninstalling");
      } finally {
        setBusyId(null);
      }
    },
    [loadAll]
  );

  const handleApproval = useCallback(
    async (plugin: AgentPlugin, action: "approve" | "reject", reason: string) => {
      setBusyId(plugin.id);
      try {
        const res = await fetch(`/api/agent-plugins/${plugin.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error || "Approval failed");
          throw new Error(data.error || "Approval failed");
        }
        toast.success(`${plugin.displayName} ${action === "approve" ? "approved" : "rejected"}`);
        setApproval(null);
        await loadAll();
      } finally {
        setBusyId(null);
      }
    },
    [loadAll]
  );

  const handleDeprecate = useCallback(
    async (plugin: AgentPlugin) => {
      setBusyId(plugin.id);
      try {
        const res = await fetch(`/api/agent-plugins/${plugin.id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok && res.status !== 404) {
          toast.error(data.error || "Deprecate failed");
          return;
        }
        toast.success(`${plugin.displayName} deprecated`);
        await loadAll();
      } catch {
        toast.error("Network error while deprecating");
      } finally {
        setBusyId(null);
        setDeprecateTarget(null);
      }
    },
    [loadAll]
  );

  const handleReview = useCallback(
    async (plugin: AgentPlugin, rating: number, reviewText: string) => {
      setBusyId(plugin.id);
      try {
        const res = await fetch(`/api/agent-plugins/${plugin.id}/reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, reviewText: reviewText || undefined }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error || "Review failed");
          throw new Error(data.error || "Review failed");
        }
        toast.success("Review saved");
        setReviewPlugin(null);
        await loadAll();
      } finally {
        setBusyId(null);
      }
    },
    [loadAll]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return plugins.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (scope !== "all" && p.scope !== scope) return false;
      if (tab === "installed" && !installedIds.has(p.id)) return false;
      if (tab === "pending_review" && p.approvalStatus !== "pending_review") return false;
      if (tab === "approved" && p.approvalStatus !== "approved") return false;
      if (!needle) return true;
      return (
        p.displayName.toLowerCase().includes(needle) ||
        p.pluginKey.toLowerCase().includes(needle) ||
        p.summary.toLowerCase().includes(needle)
      );
    });
  }, [plugins, search, category, scope, tab, installedIds]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "All", count: plugins.length },
    { key: "approved", label: "Approved", count: plugins.filter((p) => p.approvalStatus === "approved").length },
    {
      key: "pending_review",
      label: "Pending review",
      count: plugins.filter((p) => p.approvalStatus === "pending_review").length,
    },
    { key: "installed", label: "Installed", count: installations.length },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Agent Marketplace"
        description="Install sandboxed agent capabilities, review manifests and manage plugin approvals"
        actions={
          <PermissionGate permission="marketplace:plugins:publish" loadingFallback={null}>
            <Button type="button" onClick={() => setPublishOpen(true)} aria-label="Publish an agent plugin">
              <Upload aria-hidden className="mr-1.5 h-4 w-4" />
              Publish plugin
            </Button>
          </PermissionGate>
        }
      />

      <Alert variant="info" aria-label="Marketplace separation notice">
        <p className="text-sm">
          <strong>Agent Marketplace</strong> is separate from the{" "}
          <Link href="/admin/marketplace" className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}>
            App Marketplace
          </Link>
          . Apps are one-click workspace UI extensions (portals, instant utilities). Agents here carry{" "}
          <em>tool permissions, resource budgets and egress allowlists</em>, run inside the sandboxed execution engine,
          and always pass a human approval step before they become installable.
        </p>
      </Alert>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, key or summary"
            className="pl-8"
            aria-label="Search agent plugins"
          />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <SelectItem value="all">All categories</SelectItem>
          {PLUGIN_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {CATEGORY_LABEL[c] || c}
            </SelectItem>
          ))}
        </Select>
        <Select value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Filter by scope">
          <SelectItem value="all">All scopes</SelectItem>
          <SelectItem value="global">Global</SelectItem>
          <SelectItem value="institution_shared">Institution shared</SelectItem>
          <SelectItem value="institution_private">Institution private</SelectItem>
        </Select>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <Button
            key={t.key}
            type="button"
            variant="ghost"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors -mb-px ${
              tab === t.key ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            aria-current={tab === t.key ? "page" : undefined}
          >
            {t.label}
            <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">{t.count}</span>
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading agent plugins" aria-busy="true">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Store aria-hidden className="h-12 w-12 text-muted-foreground/40" />}
          title="No plugins match these filters"
          description="Clear the filters, or publish the first plugin for this institution."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PluginCard
              key={p.id}
              plugin={p}
              installed={installedIds.has(p.id)}
              busy={busyId === p.id}
              onOpen={setDetailPlugin}
              onInstall={handleInstall}
              onUninstall={handleUninstall}
              onApprove={(plugin, action) => setApproval({ plugin, action })}
              onDeprecate={setDeprecateTarget}
              onReview={setReviewPlugin}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {plugins.length} plugins shown
        <Badge variant="outline" className="ml-2 text-[10px]">
          marketplace feature flag
        </Badge>
      </p>

      <PublishPluginDialog open={publishOpen} onOpenChange={setPublishOpen} onPublished={loadAll} />
      <PluginDetailDialog plugin={detailPlugin} open={detailPlugin !== null} onOpenChange={(o) => !o && setDetailPlugin(null)} />
      <ReviewComposerDialog
        plugin={reviewPlugin}
        open={reviewPlugin !== null}
        onOpenChange={(o) => !o && setReviewPlugin(null)}
        onSubmit={handleReview}
      />
      <ApprovalDialog
        plugin={approval?.plugin ?? null}
        action={approval?.action ?? null}
        open={approval !== null}
        onOpenChange={(o) => !o && setApproval(null)}
        onSubmit={handleApproval}
      />
      <ConfirmDialog
        open={deprecateTarget !== null}
        onOpenChange={(o) => !o && setDeprecateTarget(null)}
        title={deprecateTarget ? `Deprecate ${deprecateTarget.displayName}?` : "Deprecate plugin?"}
        description="The plugin is marked deprecated and suspended. Existing installations stop being offered new runs; this is a soft delete and stays in the audit ledger."
        confirmText="Deprecate"
        onConfirm={async () => {
          if (deprecateTarget) await handleDeprecate(deprecateTarget);
        }}
      />
    </div>
  );
}
