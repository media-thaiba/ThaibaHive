"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  EntityType,
  SearchResultItem,
  GlobalSearchResult,
} from "@/lib/api/global-search/types";

const RECENT_SEARCHES_KEY = "thaibahive_recent_searches_v1";
const MAX_RECENT_SEARCHES = 10;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CacheEntry = {
  data: GlobalSearchResult;
  timestamp: number;
};

const searchCache = new Map<string, CacheEntry>();

export interface UseGlobalSearchOptions {
  debounceMs?: number;
  entityTypes?: EntityType[];
  initialQuery?: string;
  limit?: number;
}

export function useGlobalSearch(options: UseGlobalSearchOptions = {}) {
  const {
    debounceMs = 150,
    entityTypes,
    initialQuery = "",
    limit = 10,
  } = options;

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, MAX_RECENT_SEARCHES));
        }
      }
    } catch {
      // Ignore localStorage read errors in SSR/sandboxed environments
    }
  }, []);

  const addRecentSearch = useCallback((searchTerm: string) => {
    const term = searchTerm.trim();
    if (!term) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== term.toLowerCase());
      const updated = [term, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage write errors
      }
      return updated;
    });
  }, []);

  const removeRecentSearch = useCallback((searchTerm: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== searchTerm);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage write errors
      }
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore localStorage write errors
    }
  }, []);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setResults(null);
        setLoading(false);
        setError(null);
        return;
      }

      // Check in-memory cache
      const cacheKey = `${trimmed}:${entityTypes?.join(",") || "all"}:${limit}`;
      const cached = searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        setResults(cached.data);
        setLoading(false);
        setError(null);
        return;
      }

      // Cancel previous in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: trimmed,
          limit: limit.toString(),
        });
        if (entityTypes && entityTypes.length > 0) {
          params.set("entityTypes", entityTypes.join(","));
        }

        const response = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("Rate limit exceeded. Please wait a moment.");
          }
          throw new Error(`Search failed with status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.data) {
          searchCache.set(cacheKey, { data: data.data, timestamp: Date.now() });
          setResults(data.data);
          setError(null);
        } else {
          setError(data.error || "Failed to fetch search results");
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // Ignore cancellation
          return;
        }
        setError(err instanceof Error ? err.message : "An unexpected search error occurred");
      } finally {
        setLoading(false);
      }
    },
    [entityTypes, limit]
  );

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, debounceMs, performSearch]);

  const flatEntityResults = results
    ? (Object.keys(results) as (keyof GlobalSearchResult)[])
        .filter((key) => key !== "totalResults" && Array.isArray(results[key]))
        .flatMap((key) => results[key] as SearchResultItem[])
    : [];

  return {
    query,
    setQuery,
    results,
    flatEntityResults,
    loading,
    error,
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    retry: () => performSearch(query),
  };
}
