"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { getItemsForWorkspace, type NavItem, type WorkspaceConfig } from "@/config/navigation";
import {
  Search,
  ArrowRight,
  GraduationCap,
  Users,
  CheckSquare,
  Calendar,
  Megaphone,
  FileText,
  ShoppingBag,
  LifeBuoy,
  Award,
  Box,
  FileCheck,
  Clock,
  BarChart2,
  MessageSquare,
  Image as ImageIcon,
  History,
  X,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useGlobalSearch } from "@/hooks/use-global-search";
import type { EntityType, SearchResultItem } from "@/lib/api/global-search/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const ENTITY_ICON_MAP: Record<EntityType, React.ComponentType<{ className?: string }>> = {
  students: GraduationCap,
  staff: Users,
  tasks: CheckSquare,
  events: Calendar,
  announcements: Megaphone,
  "daily-reports": FileText,
  "purchase-requests": ShoppingBag,
  "help-desk-tickets": LifeBuoy,
  recognition: Award,
  "asset-inventory": Box,
  circulars: FileCheck,
  bookings: Clock,
  polls: BarChart2,
  comments: MessageSquare,
  "media-assets": ImageIcon,
};

const ENTITY_LABEL_MAP: Record<EntityType, string> = {
  students: "Student",
  staff: "Staff",
  tasks: "Task",
  events: "Event",
  announcements: "Announcement",
  "daily-reports": "Daily Report",
  "purchase-requests": "Purchase",
  "help-desk-tickets": "Help Desk",
  recognition: "Recognition",
  "asset-inventory": "Asset",
  circulars: "Circular",
  bookings: "Booking",
  polls: "Poll",
  comments: "Comment",
  "media-assets": "Media",
};

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SelectableItem =
  | { type: "workspace"; data: WorkspaceConfig }
  | { type: "nav"; data: NavItem }
  | { type: "entity"; data: SearchResultItem }
  | { type: "recent"; data: string };

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { currentWorkspace, availableWorkspaces } = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const {
    query,
    setQuery,
    flatEntityResults,
    loading,
    error,
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    retry,
  } = useGlobalSearch({ debounceMs: 150, limit: 8 });

  const workspaceItems = useMemo(
    () => getItemsForWorkspace(currentWorkspace.id),
    [currentWorkspace.id]
  );

  const navResults = useMemo(
    () =>
      query.trim() && !query.trim().startsWith("workspace:")
        ? workspaceItems.filter(
            (item) =>
              item.label.toLowerCase().includes(query.toLowerCase()) ||
              item.desc.toLowerCase().includes(query.toLowerCase())
          )
        : !query.trim()
        ? workspaceItems.slice(0, 6)
        : [],
    [query, workspaceItems]
  );

  const workspaceSwitchResults = useMemo(() => {
    if (!query.trim().startsWith("workspace:")) return [];
    const q = query.trim().slice("workspace:".length).toLowerCase();
    return availableWorkspaces.filter(
      (w) =>
        w.label.toLowerCase().includes(q) ||
        w.id.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q)
    );
  }, [query, availableWorkspaces]);

  // Unified list of selectable items for arrow key navigation
  const allSelectableItems: SelectableItem[] = useMemo(() => {
    const items: SelectableItem[] = [];

    if (workspaceSwitchResults.length > 0) {
      workspaceSwitchResults.forEach((w) => items.push({ type: "workspace", data: w }));
      return items;
    }

    if (!query.trim()) {
      recentSearches.forEach((r) => items.push({ type: "recent", data: r }));
      navResults.forEach((n) => items.push({ type: "nav", data: n }));
      return items;
    }

    navResults.forEach((n) => items.push({ type: "nav", data: n }));
    flatEntityResults.forEach((e) => items.push({ type: "entity", data: e }));

    return items;
  }, [workspaceSwitchResults, query, recentSearches, navResults, flatEntityResults]);

  // Keep selected index within bounds
  useEffect(() => {
    if (selectedIndex >= allSelectableItems.length) {
      setSelectedIndex(Math.max(0, allSelectableItems.length - 1));
    }
  }, [allSelectableItems.length, selectedIndex]);

  const handleSelect = useCallback(
    (item: SelectableItem) => {
      onOpenChange(false);
      const currentQ = query.trim();
      if (currentQ) {
        addRecentSearch(currentQ);
      }
      setQuery("");
      setSelectedIndex(0);

      switch (item.type) {
        case "workspace":
          router.push(item.data.id === "my-work" ? "/my-work" : `/${item.data.id}`);
          break;
        case "nav":
          router.push(item.data.href);
          break;
        case "entity":
          router.push(item.data.webRoute);
          break;
        case "recent":
          setQuery(item.data);
          onOpenChange(true);
          break;
      }
    },
    [onOpenChange, query, addRecentSearch, setQuery, router]
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setQuery("");
    setSelectedIndex(0);
  }, [onOpenChange, setQuery]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [open, onOpenChange]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (allSelectableItems.length > 0 ? (i + 1) % allSelectableItems.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) =>
        allSelectableItems.length > 0 ? (i - 1 + allSelectableItems.length) % allSelectableItems.length : 0
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = allSelectableItems[selectedIndex];
      if (item) {
        handleSelect(item);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const selectedEl = listEl.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (selectedEl && typeof selectedEl.scrollIntoView === "function") {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  let currentItemIndex = 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-[15%] z-50 w-full max-w-xl -translate-x-1/2 rounded-xl border bg-popover text-popover-foreground shadow-2xl animate-in fade-in zoom-in-95 overflow-hidden"
          onKeyDown={handleKeyDown}
          aria-label="Universal Command Center"
        >
          {/* Accessible Screen Reader Announcement */}
          <div aria-live="polite" className="sr-only">
            {loading
              ? "Searching..."
              : allSelectableItems.length > 0
              ? `${allSelectableItems.length} results available`
              : "No results found"}
          </div>

          <div className="flex items-center gap-3 border-b px-4 py-3 bg-muted/20">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search students, staff, tasks, events, or type 'workspace:'..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              role="combobox"
              aria-expanded={open}
              aria-autocomplete="list"
              aria-controls="command-palette-results"
            />
            {loading && <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />}
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setSelectedIndex(0);
                  inputRef.current?.focus();
                }}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                aria-label="Clear query"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              esc
            </kbd>
          </div>

          <div id="command-palette-results" ref={listRef} className="max-h-96 overflow-y-auto p-2 space-y-2">
            {/* Error state */}
            {error && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-xs">
                <span>{error}</span>
                <button
                  onClick={retry}
                  className="flex items-center gap-1 font-medium underline hover:no-underline"
                >
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              </div>
            )}

            {/* Workspace switcher results */}
            {workspaceSwitchResults.length > 0 && (
              <div>
                <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">Workspaces</p>
                {workspaceSwitchResults.map((ws) => {
                  const itemIndex = currentItemIndex++;
                  return (
                    <WorkspaceCommandItem
                      key={ws.id}
                      workspace={ws}
                      active={ws.id === currentWorkspace.id}
                      selected={selectedIndex === itemIndex}
                      dataIndex={itemIndex}
                      onSelect={() => handleSelect({ type: "workspace", data: ws })}
                    />
                  );
                })}
              </div>
            )}

            {/* Empty query state: Recent searches & Quick nav */}
            {!query.trim() && workspaceSwitchResults.length === 0 && (
              <>
                {recentSearches.length > 0 && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5" /> Recent Searches
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearRecentSearches();
                        }}
                        className="text-[10px] text-muted-foreground hover:text-foreground underline"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-3 py-1">
                      {recentSearches.map((term, i) => {
                        const itemIndex = currentItemIndex++;
                        return (
                          <div
                            key={term}
                            data-index={itemIndex}
                            onClick={() => handleSelect({ type: "recent", data: term })}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs cursor-pointer transition-colors",
                              selectedIndex === itemIndex
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted/50 hover:bg-muted text-foreground"
                            )}
                          >
                            <span>{term}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRecentSearch(term);
                              }}
                              className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full"
                              aria-label={`Remove recent search ${term}`}
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                    {currentWorkspace.label} Navigation
                  </p>
                  {navResults.map((item) => {
                    const itemIndex = currentItemIndex++;
                    return (
                      <CommandItem
                        key={item.href}
                        item={item}
                        selected={selectedIndex === itemIndex}
                        dataIndex={itemIndex}
                        onSelect={() => handleSelect({ type: "nav", data: item })}
                      />
                    );
                  })}
                </div>
              </>
            )}

            {/* Loading skeletons */}
            {loading && !results && (
              <div className="space-y-2 p-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}

            {/* Active search results */}
            {query.trim() && workspaceSwitchResults.length === 0 && (
              <>
                {/* Navigation matches */}
                {navResults.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <p className="text-xs font-semibold text-muted-foreground">Pages & Features</p>
                      <Badge variant="secondary">{navResults.length}</Badge>
                    </div>
                    {navResults.map((item) => {
                      const itemIndex = currentItemIndex++;
                      return (
                        <CommandItem
                          key={item.href}
                          item={item}
                          selected={selectedIndex === itemIndex}
                          dataIndex={itemIndex}
                          onSelect={() => handleSelect({ type: "nav", data: item })}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Entity matches */}
                {flatEntityResults.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <p className="text-xs font-semibold text-muted-foreground">Records & Entities</p>
                      <Badge variant="secondary">{flatEntityResults.length}</Badge>
                    </div>
                    {flatEntityResults.map((entity) => {
                      const itemIndex = currentItemIndex++;
                      return (
                        <EntityCommandItem
                          key={`${entity.entityType}-${entity.id}`}
                          item={entity}
                          selected={selectedIndex === itemIndex}
                          dataIndex={itemIndex}
                          onSelect={() => handleSelect({ type: "entity", data: entity })}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Empty results */}
                {!loading && navResults.length === 0 && flatEntityResults.length === 0 && (
                  <div className="px-4 py-8 text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">No matches found for &quot;{query}&quot;</p>
                    <p className="text-xs text-muted-foreground">
                      Try searching by student name, admission number, staff ID, task title, or event keyword.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground bg-muted/10">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">esc</kbd>
              close
            </span>
            <span className="flex items-center gap-1 ml-auto">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">workspace:</kbd>
              switch
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CommandItem({
  item,
  selected,
  dataIndex,
  onSelect,
}: {
  item: NavItem;
  selected: boolean;
  dataIndex: number;
  onSelect: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onSelect}
      data-index={dataIndex}
      role="option"
      aria-selected={selected}
      className={cn(
        "flex items-center gap-3 w-full rounded-lg px-3 py-2 text-left transition-colors",
        selected ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-70" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{item.label}</p>
        <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
    </button>
  );
}

function EntityCommandItem({
  item,
  selected,
  dataIndex,
  onSelect,
}: {
  item: SearchResultItem;
  selected: boolean;
  dataIndex: number;
  onSelect: () => void;
}) {
  const IconComponent = ENTITY_ICON_MAP[item.entityType] || Box;
  const entityLabel = ENTITY_LABEL_MAP[item.entityType] || item.entityType;

  return (
    <button
      onClick={onSelect}
      data-index={dataIndex}
      role="option"
      aria-selected={selected}
      className={cn(
        "flex items-center gap-3 w-full rounded-lg px-3 py-2 text-left transition-colors",
        selected ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
      )}
    >
      {item.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.avatarUrl}
          alt={item.title}
          className="h-7 w-7 rounded-full object-cover shrink-0 border"
        />
      ) : item.initials ? (
        <div className="h-7 w-7 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 border border-primary/20">
          {item.initials}
        </div>
      ) : (
        <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate leading-tight">{item.title}</p>
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 shrink-0 font-normal">
            {entityLabel}
          </Badge>
          {item.isWebOnly && (
            <Badge variant="info" className="text-[9px] py-0 px-1 h-3.5 shrink-0">
              Web Only
            </Badge>
          )}
        </div>
        {item.subtitle && <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>}
      </div>

      {item.isWebOnly ? (
        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-40" />
      ) : (
        <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
      )}
    </button>
  );
}

function WorkspaceCommandItem({
  workspace,
  active,
  selected,
  dataIndex,
  onSelect,
}: {
  workspace: { id: string; label: string; icon: any; description: string };
  active: boolean;
  selected: boolean;
  dataIndex: number;
  onSelect: () => void;
}) {
  const Icon = workspace.icon;
  return (
    <button
      onClick={onSelect}
      data-index={dataIndex}
      role="option"
      aria-selected={selected}
      className={cn(
        "flex items-center gap-3 w-full rounded-lg px-3 py-2 text-left transition-colors",
        selected ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground",
        active && "ring-1 ring-primary/30"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-70" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium leading-tight">{workspace.label}</p>
          {active && (
            <span className="text-[9px] font-semibold uppercase tracking-wider rounded-full bg-primary/20 text-primary px-1.5 py-0.5">
              Current
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{workspace.description}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
    </button>
  );
}