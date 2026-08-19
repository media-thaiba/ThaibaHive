"use client";

import React from "react";
import { ChevronRight, Home } from "lucide-react";

export type BreadcrumbItem = {
  id: string | null;
  label: string;
};

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (id: string | null) => void;
  className?: string;
}

export function Breadcrumbs({ items, onNavigate, className = "" }: BreadcrumbsProps) {
  return (
    <nav className={`flex items-center space-x-1 text-sm text-muted-foreground ${className}`}>
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className="flex items-center hover:text-foreground transition-colors p-1 rounded-md"
      >
        <Home className="w-4 h-4" />
      </button>
      {items.map((item, index) => (
        <React.Fragment key={item.id || `home-${index}`}>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />
          <button
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`px-1.5 py-0.5 rounded-md truncate max-w-[140px] transition-colors ${
              index === items.length - 1
                ? "font-semibold text-foreground bg-accent/40 cursor-default"
                : "hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
}
