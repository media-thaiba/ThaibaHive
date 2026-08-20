'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useKmAdvising } from '@/lib/hooks/km/use-km-advising';
import { DegreeProgressCard } from '@/components/operations/km/degree-progress-card';
import { CitationSourceCard } from '@/components/operations/km/citation-source-card';
import { Bot, Send, User, Sparkles } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  citations?: any[];
}

export default function StudentCopilotPage() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Hello! I am your AI Academic Copilot. Ask me anything about your degree requirements, course prerequisites, campus policies, or graduation planning.',
    },
  ]);

  const { loading, auditResult, runDegreeAudit, sendCopilotMessage } = useKmAdvising();

  const handleSend = async () => {
    if (!prompt.trim()) return;
    const userText = prompt.trim();
    setPrompt('');

    setMessages((prev) => [...prev, { role: 'user', text: userText }]);

    const response = await sendCopilotMessage('sesh_student_portal', 'std_current_user', userText);
    if (response) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: response.answerText,
          citations: response.citations,
        },
      ]);
    }
  };

  const handleAuditClick = () => {
    runDegreeAudit('std_current_user', 'BS-CS', [
      { courseCode: 'CS-101', courseTitle: 'Intro to CS', credits: 4, grade: 'A', term: 'Fall 2024' },
      { courseCode: 'CS-102', courseTitle: 'Data Structures', credits: 4, grade: 'B', term: 'Spring 2025' },
      { courseCode: 'CS-201', courseTitle: 'Computer Architecture', credits: 4, grade: 'A-', term: 'Fall 2025' },
    ]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-[calc(100vh-5rem)]">
      {/* Left Chat Column */}
      <div className="lg:col-span-2 flex flex-col h-full bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Campus AI Copilot</h2>
              <p className="text-xs text-slate-500">Autonomous Degree & Academic Advisory Assistant</p>
            </div>
          </div>
          <Badge variant="success" className="text-xs">Edge WebSocket Ready</Badge>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 text-sm ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`p-3.5 rounded-xl max-w-[80%] space-y-2 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-slate-100 text-slate-800 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-line text-xs md:text-sm">{msg.text}</p>
                {msg.citations && msg.citations.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 block">Verified Citations:</span>
                    {msg.citations.map((c: any, cIdx: number) => (
                      <CitationSourceCard key={cIdx} citation={c} />
                    ))}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t bg-slate-50 flex gap-2">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question about your courses, prerequisites, or policies..."
            className="bg-white"
          />
          <Button onClick={handleSend} disabled={loading} className="gap-1">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Right Column: Degree Progress & Advisory Shortcuts */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Advisory Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start text-xs" onClick={handleAuditClick}>
              Run My Real-Time Degree Audit
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-xs"
              onClick={() => setPrompt('What are the prerequisites for CS-301?')}
            >
              Check Prerequisites for Next Term
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-xs"
              onClick={() => setPrompt('Recommend career paths matching my transcript')}
            >
              Explore Career Pathways
            </Button>
          </CardContent>
        </Card>

        {auditResult ? (
          <DegreeProgressCard audit={auditResult} />
        ) : (
          <Card className="p-6 text-center text-slate-500 text-xs">
            Click &quot;Run My Real-Time Degree Audit&quot; to view live academic requirement fulfillment.
          </Card>
        )}
      </div>
    </div>
  );
}
