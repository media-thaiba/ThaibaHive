'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AgentBadge } from './agent-badge';
import { RoadmapDiffCard } from './roadmap-diff-card';
import { QuickPromptChips } from './quick-prompt-chips';
import { ensureArray } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  senderType: 'student' | 'agent' | 'human_advisor';
  agentDomain?: string;
  messageContent: string;
  citations?: any[];
  roadmapAction?: any;
  sentAt: string;
}

interface AdvisingChatDrawerProps {
  sessionId?: string;
  studentId?: string;
  initialMessages?: ChatMessage[];
  onSendMessage?: (prompt: string) => Promise<ChatMessage>;
  onApplyRoadmapAction?: (action: any) => void;
}

const defaultPrompts = [
  'What courses should I take next semester?',
  'What are the electives for an AI specialization?',
  'How do I transfer prior credits for CS101?',
  'What is the credit overload policy?',
];

export const AdvisingChatDrawer: React.FC<AdvisingChatDrawerProps> = ({
  sessionId = 'sess_demo',
  studentId = 'stud_demo',
  initialMessages = [
    {
      id: 'm1',
      senderType: 'agent',
      agentDomain: 'degree_planner',
      messageContent: 'Hello! I am your autonomous AI Academic Advisor. How can I help optimize your graduation path today?',
      sentAt: new Date().toISOString(),
    },
  ],
  onSendMessage,
  onApplyRoadmapAction,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const studentMsg: ChatMessage = {
      id: `msg_stud_${Date.now()}`,
      senderType: 'student',
      messageContent: text,
      sentAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, studentMsg]);
    setInputText('');
    setIsSending(true);

    try {
      if (onSendMessage) {
        const reply = await onSendMessage(text);
        setMessages((prev) => [...prev, reply]);
      } else {
        // Local simulation response
        const mockReply: ChatMessage = {
          id: `msg_agent_${Date.now()}`,
          senderType: 'agent',
          agentDomain: 'degree_planner',
          messageContent: `Based on your major requirements for ${text}, we recommend taking major core courses in sequence and maintaining at least 15 credits per term.`,
          citations: [
            {
              documentTitle: 'Academic Catalog',
              section: 'Section 4.1',
              excerpt: 'Undergraduate degrees require a minimum of 120 credit hours.',
            },
          ],
          sentAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, mockReply]);
      }
    } catch {
      // Handle gracefully
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="flex flex-col h-[520px] bg-card border shadow-lg">
      <CardHeader className="py-3 px-4 border-b flex-shrink-0">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Autonomous Advising Copilot</span>
            <AgentBadge domain="degree_planner" />
          </div>
          <span className="text-xs text-muted-foreground">Session: {sessionId}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 flex-1 overflow-y-auto space-y-3">
        {ensureArray<ChatMessage>(messages).map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.senderType === 'student' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              {m.senderType === 'agent' && m.agentDomain && <AgentBadge domain={m.agentDomain} />}
              <span className="text-[10px] text-muted-foreground">
                {m.senderType === 'student' ? 'You' : 'Advisor'} · {new Date(m.sentAt).toLocaleTimeString()}
              </span>
            </div>

            <div
              className={`p-3 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                m.senderType === 'student'
                  ? 'bg-primary text-primary-foreground rounded-tr-none'
                  : 'bg-muted/70 text-foreground rounded-tl-none border'
              }`}
            >
              {m.messageContent}

              {m.roadmapAction && (
                <RoadmapDiffCard
                  action={m.roadmapAction}
                  onApply={() => onApplyRoadmapAction && onApplyRoadmapAction(m.roadmapAction)}
                />
              )}

              {m.citations && m.citations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50 text-[10px] opacity-80">
                  <span className="font-semibold">Citations:</span> {m.citations[0].documentTitle} ({m.citations[0].section})
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>

      <div className="p-3 border-t bg-muted/20 space-y-2">
        <QuickPromptChips prompts={defaultPrompts} onSelectPrompt={(p) => handleSend(p)} />
        <div className="flex gap-2">
          <Input
            placeholder="Ask advising question (e.g. course prerequisites, career electives, transfer credits)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isSending}
          />
          <Button size="sm" onClick={() => handleSend()} disabled={isSending || !inputText.trim()}>
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
};
