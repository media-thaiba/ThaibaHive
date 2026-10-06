"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  paths: Record<string, Record<string, {
    summary?: string;
    description?: string;
    tags?: string[];
    security?: unknown[];
    parameters?: Array<{ name: string; in: string; required?: boolean; description?: string }>;
    responses?: Record<string, { description?: string }>;
  }>>;
}

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");

  useEffect(() => {
    fetch("/api/openapi.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSpec(data);
      })
      .catch((err) => console.error("Failed to load OpenAPI spec", err))
      .finally(() => setLoading(false));
  }, []);

  const allTags = spec
    ? Array.from(
        new Set(
          Object.values(spec.paths).flatMap((pathItem) =>
            Object.values(pathItem).flatMap((operation) => operation.tags || [])
          )
        )
      ).sort()
    : [];

  const filteredPaths = spec
    ? Object.entries(spec.paths).filter(([pathStr, operations]) => {
        const matchesSearch =
          pathStr.toLowerCase().includes(search.toLowerCase()) ||
          Object.values(operations).some(
            (op) =>
              op.summary?.toLowerCase().includes(search.toLowerCase()) ||
              op.description?.toLowerCase().includes(search.toLowerCase())
          );
        const matchesTag =
          selectedTag === "all" ||
          Object.values(operations).some((op) => op.tags?.includes(selectedTag));
        return matchesSearch && matchesTag;
      })
    : [];

  const getMethodBadgeVariant = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "info";
      case "POST":
        return "success";
      case "PUT":
      case "PATCH":
        return "warning";
      case "DELETE":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <header className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>⚡</span> {spec?.info?.title || "ThaibaHive API Documentation"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {spec?.info?.description || "OpenAPI 3.1.0 Interactive Native API Console (Self-Hosted, Zero CDN)"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Download openapi.json
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search endpoints, summaries, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Categories ({allTags.length})</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full bg-slate-800" />
            <Skeleton className="h-20 w-full bg-slate-800" />
            <Skeleton className="h-20 w-full bg-slate-800" />
          </div>
        ) : filteredPaths.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
            No API endpoints match your search filters.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPaths.map(([pathStr, operations]) =>
              Object.entries(operations).map(([method, op]) => (
                <div
                  key={`${method}-${pathStr}`}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={getMethodBadgeVariant(method)} className="uppercase font-mono font-bold">
                      {method}
                    </Badge>
                    <code className="text-sm font-semibold text-slate-200">{pathStr}</code>
                    {op.tags?.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>

                  {op.summary && <p className="text-sm text-slate-300 mt-2 font-medium">{op.summary}</p>}
                  {op.description && <p className="text-xs text-slate-400 mt-1">{op.description}</p>}

                  {op.parameters && op.parameters.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parameters:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {op.parameters.map((p) => (
                          <span
                            key={p.name}
                            className="text-xs bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-slate-300"
                          >
                            <span className="font-mono text-indigo-400">{p.name}</span>{" "}
                            <span className="text-slate-500">({p.in}{p.required ? ", required" : ""})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
