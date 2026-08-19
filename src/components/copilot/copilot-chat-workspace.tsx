"use client";

import React, { useState, useEffect } from "react";
import { AgentSelectorTabs } from "./agent-selector-tabs";
import { RecommendationCard, RecommendationCardProps } from "./recommendation-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function CopilotChatWorkspace() {
  const [selectedAgent, setSelectedAgent] = useState<"academic_advisor" | "financial_controller" | "compliance_auditor">("academic_advisor");
  const [queryInput, setQueryInput] = useState("");
  const [recommendations, setRecommendations] = useState<RecommendationCardProps[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecommendations = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/copilots/recommendations?tenantId=inst_101");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.recommendations)) {
          const mapped = data.recommendations
            .filter((r: any) => {
              if (selectedAgent === "academic_advisor") return r.domain === "academics";
              if (selectedAgent === "financial_controller") return r.domain === "finance";
              return r.domain === "compliance";
            })
            .map((r: any) => ({
              id: r.id,
              title: r.title,
              summary: r.summary,
              domain: r.domain,
              confidenceScore: r.confidenceScore,
              humanApprovalStatus: r.humanApprovalStatus,
              createdAt: r.createdAt,
            }));
          setRecommendations(mapped);
        }
      }
    } catch {
      // Catch fetch error
    } finally {
      setLoading(false);
    }
  }, [selectedAgent]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleSendQuery = async () => {
    if (!queryInput.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/copilots/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: selectedAgent,
          campusId: "inst_101",
          query: queryInput,
        }),
      });

      if (res.ok) {
        const newRec = await res.json();
        setRecommendations((prev) => [newRec, ...prev]);
        setQueryInput("");
      }
    } catch {
      // Catch
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <AgentSelectorTabs selectedAgent={selectedAgent} onSelect={setSelectedAgent} />

      <div className="flex gap-2">
        <input
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder={`Ask ${selectedAgent.replace("_", " ")} copilot...`}
          className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onKeyDown={(e) => e.key === "Enter" && handleSendQuery()}
        />
        <Button onClick={handleSendQuery} disabled={loading}>
          {loading ? "Analyzing..." : "Ask Copilot"}
        </Button>
      </div>

      <div className="space-y-4">
        {loading && recommendations.length === 0 ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full bg-slate-800" />
            <Skeleton className="h-28 w-full bg-slate-800" />
          </div>
        ) : recommendations.length === 0 ? (
          <p className="text-sm text-slate-400">No recommendations generated yet for this domain.</p>
        ) : (
          recommendations.map((rec) => <RecommendationCard key={rec.id} {...rec} />)
        )}
      </div>
    </div>
  );
}
