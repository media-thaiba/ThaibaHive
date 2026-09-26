'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';

export interface CitationItem {
  documentTitle: string;
  sectionTitle?: string;
  contentSnippet: string;
  relevanceScore: number;
}

export function CitationSourceCard({ citation }: { citation: CitationItem }) {
  return (
    <Card className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg text-xs space-y-1 hover:bg-slate-100 transition-colors">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
          <BookOpen className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
          {citation.documentTitle}
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {(citation.relevanceScore * 100).toFixed(0)}% Match
        </Badge>
      </div>
      {citation.sectionTitle && (
        <div className="text-[11px] text-indigo-600 font-medium">{citation.sectionTitle}</div>
      )}
      <p className="text-slate-600 text-[11px] line-clamp-2 italic">&ldquo;{citation.contentSnippet}&rdquo;</p>
    </Card>
  );
}
