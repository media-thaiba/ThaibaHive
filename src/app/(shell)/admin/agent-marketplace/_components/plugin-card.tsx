"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { PermissionGate } from "@/components/ui/permission-gate";
import { BadgeCheck, Download, Eye, ShieldAlert, Star, Trash2 } from "lucide-react";
import { CapabilityTags } from "./capability-tags";
import { StarRating } from "./star-rating";
import {
  APPROVAL_VARIANT,
  CATEGORY_LABEL,
  SCOPE_LABEL,
  parseCapabilities,
  type AgentPlugin,
} from "./types";

type PluginCardProps = {
  plugin: AgentPlugin;
  installed: boolean;
  busy?: boolean;
  onOpen: (plugin: AgentPlugin) => void;
  onInstall: (plugin: AgentPlugin) => void;
  onUninstall: (plugin: AgentPlugin) => void;
  onApprove: (plugin: AgentPlugin, action: "approve" | "reject") => void;
  onDeprecate: (plugin: AgentPlugin) => void;
  onReview: (plugin: AgentPlugin) => void;
};

export function PluginCard({
  plugin,
  installed,
  busy,
  onOpen,
  onInstall,
  onUninstall,
  onApprove,
  onDeprecate,
  onReview,
}: PluginCardProps) {
  const capabilities = parseCapabilities(plugin.capabilitiesJson);
  const installable = plugin.approvalStatus === "approved" && plugin.status === "active";
  const pending = plugin.approvalStatus === "pending_review";

  return (
    <Card className="flex flex-col h-full" aria-label={`Plugin ${plugin.displayName}`}>
      <CardContent className="flex-1 space-y-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-semibold text-sm truncate">
              <span className="truncate">{plugin.displayName}</span>
              {plugin.authorVerified && (
                <BadgeCheck aria-label="Verified author" className="h-3.5 w-3.5 shrink-0 text-info" />
              )}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              {plugin.pluginKey}@{plugin.version}
            </p>
          </div>
          <Badge variant={APPROVAL_VARIANT[plugin.approvalStatus]} className="text-[10px] shrink-0">
            {plugin.approvalStatus.replace("_", " ")}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2">{plugin.summary}</p>

        <CapabilityTags capabilities={capabilities} />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <Badge variant="secondary" className="text-[10px]">
            {CATEGORY_LABEL[plugin.category] || plugin.category}
          </Badge>
          <span>{SCOPE_LABEL[plugin.scope]}</span>
          <span className="inline-flex items-center gap-1">
            <Download aria-hidden className="h-3 w-3" />
            {plugin.installedCount}
          </span>
        </div>

        <StarRating value={plugin.ratingAvg} count={plugin.ratingCount} />
      </CardContent>

      <CardFooter className="flex flex-wrap gap-1.5 pt-0">
        <Button type="button" size="sm" variant="ghost" onClick={() => onOpen(plugin)} aria-label={`View ${plugin.displayName} details`}>
          <Eye aria-hidden className="mr-1 h-3 w-3" />
          Details
        </Button>

        <PermissionGate permission="marketplace:install" fallback={null} loadingFallback={null}>
          {installed ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onUninstall(plugin)}
              aria-label={`Uninstall ${plugin.displayName}`}
            >
              <Trash2 aria-hidden className="mr-1 h-3 w-3" />
              Uninstall
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={busy || !installable}
              onClick={() => onInstall(plugin)}
              aria-label={`Install ${plugin.displayName}`}
              title={installable ? undefined : "Only approved, active plugins can be installed"}
            >
              <Download aria-hidden className="mr-1 h-3 w-3" />
              Install
            </Button>
          )}
        </PermissionGate>

        {installable && (
          <PermissionGate permission="marketplace:reviews:write" fallback={null} loadingFallback={null}>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onReview(plugin)}
              aria-label={`Review ${plugin.displayName}`}
            >
              <Star aria-hidden className="mr-1 h-3 w-3" />
              Rate
            </Button>
          </PermissionGate>
        )}

        {pending && (
          <PermissionGate permission="marketplace:plugins:approve" fallback={null} loadingFallback={null}>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onApprove(plugin, "approve")}
              aria-label={`Approve ${plugin.displayName}`}
            >
              <Star aria-hidden className="mr-1 h-3 w-3" />
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => onApprove(plugin, "reject")}
              aria-label={`Reject ${plugin.displayName}`}
            >
              <ShieldAlert aria-hidden className="mr-1 h-3 w-3" />
              Reject
            </Button>
          </PermissionGate>
        )}

        <PermissionGate permission="marketplace:plugins:publish" fallback={null} loadingFallback={null}>
          {plugin.approvalStatus !== "deprecated" && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => onDeprecate(plugin)}
              aria-label={`Deprecate ${plugin.displayName}`}
            >
              <ShieldAlert aria-hidden className="mr-1 h-3 w-3" />
              Deprecate
            </Button>
          )}
        </PermissionGate>
      </CardFooter>
    </Card>
  );
}
