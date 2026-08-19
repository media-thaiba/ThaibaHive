"use client";

import React, { useRef, useState, useEffect } from "react";
import { PlaybackEvent } from "@/lib/observability/playback-engine";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlaybackEventListProps {
  events: PlaybackEvent[];
  currentIndex: number;
  onSelectEvent: (index: number) => void;
}

export const PlaybackEventList: React.FC<PlaybackEventListProps> = ({
  events,
  currentIndex,
  onSelectEvent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const rowHeight = 52; // Height of each row in pixels
  const containerHeight = 350; // Visible container height

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const totalHeight = events.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
  const endIndex = Math.min(
    events.length - 1,
    Math.floor((scrollTop + containerHeight) / rowHeight) + 2
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (events.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = Math.min(events.length - 1, currentIndex + 1);
      onSelectEvent(nextIndex);
      scrollToIndex(nextIndex);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = Math.max(0, currentIndex - 1);
      onSelectEvent(prevIndex);
      scrollToIndex(prevIndex);
    }
  };

  const scrollToIndex = (index: number) => {
    if (!containerRef.current) return;
    const targetScrollTop = index * rowHeight;
    const currentScrollTop = containerRef.current.scrollTop;

    if (targetScrollTop < currentScrollTop) {
      containerRef.current.scrollTop = targetScrollTop;
    } else if (targetScrollTop + rowHeight > currentScrollTop + containerHeight) {
      containerRef.current.scrollTop = targetScrollTop + rowHeight - containerHeight;
    }
  };

  // Keep active index in view
  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < events.length) {
      scrollToIndex(currentIndex);
    }
  }, [currentIndex, events.length]);

  const visibleEvents = [];
  for (let i = startIndex; i <= endIndex; i++) {
    if (events[i]) {
      visibleEvents.push({ event: events[i], index: i });
    }
  }

  const getSeverityVariant = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "destructive";
      case "error":
        return "destructive";
      case "warning":
        return "warning";
      case "info":
      default:
        return "secondary";
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="w-full rounded-lg border border-border bg-slate-900/40 outline-none focus:ring-1 focus:ring-primary/40 overflow-y-auto"
      style={{ height: `${containerHeight}px` }}
    >
      <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
        <div
          className="absolute left-0 right-0 top-0 w-full"
          style={{ transform: `translateY(${startIndex * rowHeight}px)` }}
        >
          {visibleEvents.map(({ event, index }) => {
            const isSelected = index === currentIndex;
            const timeString = new Date(event.timestamp).toLocaleTimeString();
            
            return (
              <div
                key={event.data.id || `${event.type}-${index}`}
                onClick={() => onSelectEvent(index)}
                style={{ height: `${rowHeight}px` }}
                className={cn(
                  "flex items-center justify-between px-3 border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer select-none text-xs transition-colors",
                  isSelected && "bg-primary/10 hover:bg-primary/15 border-l-2 border-l-primary"
                )}
              >
                <div className="flex flex-col gap-0.5 truncate pr-2">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    [{timeString}] {event.data.eventSource || event.data.nodeId}
                  </span>
                  <span className="font-medium text-slate-200 truncate">
                    {event.type === "event" ? event.data.message : `${event.data.metricName} = ${event.data.metricValue}`}
                  </span>
                </div>
                
                {event.type === "event" ? (
                  <Badge variant={getSeverityVariant(event.data.severity)} className="h-5 text-[9px] uppercase px-1">
                    {event.data.severity}
                  </Badge>
                ) : (
                  <Badge variant="info" className="h-5 text-[9px] uppercase px-1">
                    METRIC
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
