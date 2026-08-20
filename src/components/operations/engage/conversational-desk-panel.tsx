'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useEngageChat } from '@/lib/hooks/engage/use-engage-chat';

export function ConversationalDeskPanel() {
  const [inputText, setInputText] = useState('');
  const { messages, loading, sessionStatus, sendMessage } = useEngageChat('admin_preview_session');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText, 'admin_operator');
    setInputText('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Conversational Hub & Human-in-the-Loop Desk</span>
            <Badge variant={sessionStatus === 'agent_pending' ? 'warning' : 'success'}>
              {sessionStatus === 'agent_pending' ? 'Escalation Pending' : 'AI Bot Active'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-muted/20 h-80 overflow-y-auto space-y-3 mb-4 flex flex-col">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground my-auto">
                No conversation turns yet. Type a query below to test the AI conversational assistant.
              </div>
            ) : (
              messages.map((m: any, idx: number) => (
                <div
                  key={m.messageId || idx}
                  className={`max-w-[75%] p-3 rounded-lg text-sm ${
                    m.senderType === 'stakeholder'
                      ? 'bg-primary text-primary-foreground self-end'
                      : 'bg-card border self-start shadow-sm'
                  }`}
                >
                  <p className="font-semibold text-xs opacity-75 mb-1">
                    {m.senderType === 'stakeholder' ? 'You' : 'Thaiba Assistant'}
                  </p>
                  <p>{m.text}</p>
                </div>
              ))
            )}
            {loading && (
              <div className="text-xs text-muted-foreground italic self-start">
                Thaiba Assistant is typing...
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              placeholder="Ask attendance, fee balance, exam schedule..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !inputText.trim()}>
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
