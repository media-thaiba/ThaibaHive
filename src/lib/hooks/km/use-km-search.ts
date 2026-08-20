import { useState, useCallback } from 'react';
import { SearchResultItem } from '@/lib/operations/km/km-types';

export function useKmSearch() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const searchKnowledge = useCallback(async (query: string, category?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/km/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, category, topK: 5 }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResults(data.results || []);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, results, error, searchKnowledge };
}
