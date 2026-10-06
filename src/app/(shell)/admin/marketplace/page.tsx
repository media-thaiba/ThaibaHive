"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AppCard } from "@/components/marketplace/app-card";
import { AccessRequestDialog } from "@/components/marketplace/access-request-dialog";
import { toast } from "sonner";

type App = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  category: string;
  status: "not_installed" | "installed" | "pending_request";
  installedAt: string | null;
};

type Tab = "all" | "instant" | "restricted" | "installed";

export default function MarketplacePage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [requestDialog, setRequestDialog] = useState<{ open: boolean; appId: string; appName: string }>({
    open: false,
    appId: "",
    appName: "",
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const fetchApps = useCallback(async () => {
    try {
      const res = await fetch("/api/marketplace/apps");
      if (res.ok) {
        const data = await res.json();
        setApps(data.apps);
      }
    } catch {
      toast.error("Failed to load marketplace");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleInstall = async (appId: string) => {
    setInstallingId(appId);
    try {
      const res = await fetch("/api/marketplace/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        fetchApps();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to install app");
    } finally {
      setInstallingId(null);
    }
  };

  const handleRequestAccess = (appId: string) => {
    const app = apps.find((a) => a.id === appId);
    if (app) {
      setRequestDialog({ open: true, appId, appName: app.name });
    }
  };

  const handleSubmitRequest = async (reason: string) => {
    setSubmittingRequest(true);
    try {
      const res = await fetch("/api/marketplace/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: requestDialog.appId, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Access request submitted");
        setRequestDialog({ open: false, appId: "", appName: "" });
        fetchApps();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to submit request");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const filteredApps = apps.filter((app) => {
    switch (activeTab) {
      case "instant": return app.category === "instant";
      case "restricted": return app.category === "restricted";
      case "installed": return app.status === "installed";
      default: return true;
    }
  });

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "All", count: apps.length },
    { key: "instant", label: "Instant", count: apps.filter((a) => a.category === "instant").length },
    { key: "restricted", label: "Restricted", count: apps.filter((a) => a.category === "restricted").length },
    { key: "installed", label: "Installed", count: apps.filter((a) => a.status === "installed").length },
  ];

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <PageHeader
        title="App Marketplace"
        description="Browse and install workspace extensions"
      />

      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant="ghost"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors -mb-px ${
              activeTab === tab.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {tab.count}
            </span>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredApps.map((app) => (
          <AppCard
            key={app.id}
            app={app}
            onInstall={handleInstall}
            onRequestAccess={handleRequestAccess}
            isInstalling={installingId === app.id}
          />
        ))}
      </div>

      {filteredApps.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No apps found in this category.
        </div>
      )}

      <AccessRequestDialog
        open={requestDialog.open}
        onOpenChange={(open) => setRequestDialog((prev) => ({ ...prev, open }))}
        appName={requestDialog.appName}
        onSubmit={handleSubmitRequest}
        isSubmitting={submittingRequest}
      />
    </div>
  );
}
