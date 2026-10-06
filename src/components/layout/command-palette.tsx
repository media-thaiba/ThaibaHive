"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { getItemsForWorkspace, type NavItem, type WorkspaceConfig } from "@/config/navigation";
import { Search, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { currentWorkspace, availableWorkspaces } = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const workspaceItems = useMemo(() => getItemsForWorkspace(currentWorkspace.id), [currentWorkspace.id]);

  const results = useMemo(
    () =>
      query.trim()
        ? workspaceItems.filter(
            (item) =>
              item.label.toLowerCase().includes(query.toLowerCase()) ||
              item.desc.toLowerCase().includes(query.toLowerCase())
          )
        : workspaceItems.slice(0, 10),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSelect = useCallback(
    (item: NavItem) => {
      onOpenChange(false);
      setQuery("");
      setSelectedIndex(0);
      router.push(item.href);
    },
    [onOpenChange, router]
  );

  const handleWorkspaceSwitch = useCallback(
    (workspace: WorkspaceConfig) => {
      onOpenChange(false);
      setQuery("");
      setSelectedIndex(0);
      router.push(workspace.id === "my-work" ? "/my-work" : `/${workspace.id}`);
    },
    [onOpenChange, router]
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setQuery("");
    setSelectedIndex(0);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  function handleKeyDown(e: React.KeyboardEvent) {
    const totalResults = results.length + workspaceSwitchResults.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, totalResults - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (workspaceSwitchResults.length > 0 && selectedIndex < workspaceSwitchResults.length) {
        handleWorkspaceSwitch(workspaceSwitchResults[selectedIndex]);
      } else if (results.length > 0) {
        const itemIndex = selectedIndex - workspaceSwitchResults.length;
        if (results[itemIndex]) {
          handleSelect(results[itemIndex]);
        }
      }
    } else if (e.key === "Escape") {
      handleClose();
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border bg-popover shadow-2xl animate-in fade-in zoom-in-95"
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search features, type 'workspace:' to switch..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              esc
            </kbd>
          </div>

          <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 && workspaceSwitchResults.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No results found
              </p>
            )}

            {/* Workspace switch results */}
            {workspaceSwitchResults.length > 0 && (
              <div className="mb-2">
                <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  Workspaces
                </p>
                {workspaceSwitchResults.map((ws, i) => (
                  <WorkspaceCommandItem
                    key={ws.id}
                    workspace={ws}
                    active={ws.id === currentWorkspace.id}
                    selected={selectedIndex === i}
                    onSelect={() => handleWorkspaceSwitch(ws)}
                  />
                ))}
              </div>
            )}

            {/* Regular results */}
            {query.trim() && (
              results.map((item, i) => (
                <CommandItem
                  key={item.href}
                  item={item}
                  selected={i + workspaceSwitchResults.length === selectedIndex}
                  onSelect={() => handleSelect(item)}
                />
              ))
            )}

            {!query.trim() && (
              <>
                <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  {currentWorkspace.label}
                </p>
                {workspaceItems.slice(0, 8).map((item, i) => (
                  <CommandItem
                    key={item.href}
                    item={item}
                    selected={i === selectedIndex}
                    onSelect={() => handleSelect(item)}
                  />
                ))}
                {workspaceItems.length > 8 && (
                  <p className="px-3 py-2 text-center text-xs text-muted-foreground">
                    Type to search more...
                  </p>
                )}
              </>
            )}
          </div>

          <div className="border-t px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">
                ↑↓
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">
                ↵
              </kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">
                esc
              </kbd>
              close
            </span>
            <span className="flex items-center gap-1 ml-auto">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">
                ws
              </kbd>
              workspace
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
  onSelect,
}: {
  item: NavItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left transition-colors",
        selected ? "bg-primary/10 text-primary" : "hover:bg-muted"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{item.label}</p>
        <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
    </button>
  );
}

function WorkspaceCommandItem({
  workspace,
  active,
  selected,
  onSelect,
}: {
  workspace: { id: string; label: string; icon: any; description: string; color: string; bgColor: string };
  active: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = workspace.icon;
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left transition-colors",
        selected ? "bg-primary/10 text-primary" : "hover:bg-muted",
        active && "ring-2 ring-primary/20"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{workspace.label}</p>
          {active && (
            <span className="text-[10px] font-semibold uppercase tracking-wider rounded-full bg-primary/20 text-primary px-1.5 py-0.5">
              Current
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{workspace.description}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
    </button>
  );
}