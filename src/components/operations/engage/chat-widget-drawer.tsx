'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useEngageChat } from '@/lib/hooks/engage/use-engage-chat';

export function ChatWidgetDrawer({ stakeholderId = 'student_portal_user' }: { stakeholderId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const { messages, loading, sessionStatus, sendMessage } = useEngageChat(`portal_sesh_${stakeholderId}`);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    sendMessage(inputVal, stakeholderId);
    setInputVal('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-14 w-14 shadow-lg flex items-center justify-center p-0"
        >
          <span className="text-xl">💬</span>
        </Button>
      ) : (
        <Card className="w-80 sm:w-96 shadow-2xl border-2">
          <CardHeader className="p-4 bg-primary text-primary-foreground rounded-t-lg flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Campus Virtual Assistant</CardTitle>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-primary-foreground/80">Online & Ready</span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setIsOpen(false)}
            >
              &times; Close
            </Button>
          </CardHeader>
          <CardContent className="p-3">
            <div className="h-72 overflow-y-auto space-y-2 p-2 bg-muted/20 rounded border mb-3 flex flex-col">
              {messages.length === 0 ? (
                <div className="text-xs text-muted-foreground my-auto text-center">
                  Hello! How can I assist you with your courses, exams, or fees today?
                </div>
              ) : (
                messages.map((m: any, i: number) => (
                  <div
                    key={m.messageId || i}
                    className={`max-w-[80%] p-2.5 rounded-lg text-xs ${
                      m.senderType === 'stakeholder'
                        ? 'bg-primary text-primary-foreground self-end'
                        : 'bg-card border self-start shadow-sm'
                    }`}
                  >
                    <p>{m.text}</p>
                  </div>
                ))
              )}
              {loading && (
                <div className="text-xs text-muted-foreground italic self-start">
                  Thinking...
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                placeholder="Type your question..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                disabled={loading}
                className="text-xs"
              />
              <Button type="submit" size="sm" disabled={loading || !inputVal.trim()}>
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
