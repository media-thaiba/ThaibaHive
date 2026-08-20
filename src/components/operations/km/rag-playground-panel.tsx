'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useKmSearch } from '@/lib/hooks/km/use-km-search';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, BookOpen, Layers } from 'lucide-react';

export function RagPlaygroundPanel() {
  const [query, setQuery] = useState('What are the graduation requirements?');
  const { loading, results, error, searchKnowledge } = useKmSearch();

  const handleSearch = () => {
    if (query.trim()) {
      searchKnowledge(query.trim());
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-emerald-600" />
            <CardTitle>Hybrid RAG Retrieval Playground</CardTitle>
          </div>
          <Badge variant="success">Dense + Sparse BM25 Fusion</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything across syllabi, bylaws, or regulations..."
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? 'Retrieving...' : 'Run Hybrid Search'}
          </Button>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {results.length > 0 && !loading && (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-700 flex items-center gap-1">
              <Layers className="h-4 w-4 text-emerald-600" />
              Retrieved Context Passages ({results.length})
            </div>
            {results.map((res, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border rounded-md text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                    {res.citations.title}
                  </span>
                  <Badge variant="secondary">Score: {res.fusedScore.toFixed(3)}</Badge>
                </div>
                <p className="text-slate-600 text-xs line-clamp-3">{res.chunk.content}</p>
                <div className="text-[11px] text-slate-400">Section: {res.citations.section}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
