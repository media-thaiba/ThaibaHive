import { useState, useCallback } from 'react';
import { ensureArray } from '@/lib/utils';

export function useEngageChat(sessionId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sessionStatus, setSessionStatus] = useState<string>('bot_active');
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string, stakeholderId = 'user_student') => {
      setLoading(true);
      // Optimistic user message append
      const tempUserMsg = {
        messageId: `temp_${Date.now()}`,
        senderType: 'stakeholder',
        text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      try {
        const res = await fetch('/api/engage/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            stakeholderId,
            text,
          }),
        });
        const data = await res.json();
        if (data.botReplyText) {
          const botMsg = {
            messageId: `bot_${Date.now()}`,
            senderType: 'bot',
            text: data.botReplyText,
            richPayloadData: JSON.stringify({ suggestedActions: data.suggestedActions }),
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, botMsg]);
          setSessionStatus(data.sessionStatus || 'bot_active');
        }
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to send message');
        setLoading(false);
      }
    },
    [sessionId]
  );

  return {
    messages: ensureArray(messages),
    loading,
    sessionStatus,
    error,
    sendMessage,
  };
}
