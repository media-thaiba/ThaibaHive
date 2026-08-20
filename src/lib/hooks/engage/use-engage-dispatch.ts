import { useState, useEffect, useCallback } from 'react';
import { ensureArray } from '@/lib/utils';

export function useEngageDispatch() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(() => {
    setLoading(true);
    fetch('/api/engage/campaigns')
      .then((res) => res.json())
      .then((data) => {
        if (data.campaigns) {
          setMessages(ensureArray(data.campaigns));
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch dispatch messages');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const dispatchQuickMessage = async (payload: any) => {
    try {
      const res = await fetch('/api/engage/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      fetchMessages();
      return data;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to dispatch');
    }
  };

  return {
    messages,
    loading,
    error,
    refetch: fetchMessages,
    dispatchQuickMessage,
  };
}
